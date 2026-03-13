import { analyzePost } from '../services/analysisService.js';
import { detectMisinformationBatch } from '../services/aiService.js';
import FlaggedPost from '../models/FlaggedPost.model.js';

// ─── Single post (used by extension manual trigger / tests) ──────────────────
export const analyzeContent = async (req, res, next) => {
  try {
    const { text, platform, author, force } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400);
      throw new Error('Valid text content is required');
    }
    const result = await analyzePost(
      text.trim(),
      (platform || 'other').toLowerCase(),
      author || 'unknown',
      force
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Batch endpoint: accepts array of up to 10 posts, ONE Gemini call ─────────
// Body: { posts: [ { text, author, platform }, ... ], limit?: 200 }
const GLOBAL_CALL_LIMIT = 200;
let globalCallCount = 0;

export const analyzeBatch = async (req, res, next) => {
  try {
    const { posts } = req.body;

    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ error: 'posts[] array required' });
    }

    // Hard limit: max 10 per call, max 200 total session calls
    const batch = posts.slice(0, 10);

    if (globalCallCount >= GLOBAL_CALL_LIMIT) {
      console.warn('[ShieldNet] Global API call limit (200) reached for this session.');
      return res.status(429).json({
        error: 'Session limit reached',
        results: batch.map(p => ({
          text: p.text,
          fakeScore: 0,
          verdict: 'SAFE',
          confidence: 'Low',
          explanation: 'API limit reached for this session. Posts not analyzed.',
          flagged: false
        }))
      });
    }
    globalCallCount++;

    // ── Build one compact prompt for all posts ─────────────────────────────────
    const postLines = batch.map((p, i) =>
      `[${i}] "${(p.text || '').replace(/"/g, "'").substring(0, 300)}"`
    ).join('\n\n');

    const prompt = `You are ShieldNet, a misinformation fact-checker. Analyze these ${batch.length} social media posts.
For each post, determine if it is FAKE, MISLEADING, OPINION, or SAFE based on journalistic standards.
Return ONLY a valid JSON array. No markdown, no extra text.

POSTS:
${postLines}

JSON FORMAT (array of ${batch.length} objects):
[
  {
    "id": 0,
    "fakeScore": <0-100 integer>,
    "verdict": "FAKE|MISLEADING|OPINION|SAFE",
    "confidence": "High|Medium|Low",
    "reason": "<2 concise sentences explaining the verdict>"
  }
]`;

    // ── Try each Gemini key in order, then OpenAI as fallback ─────────────────
    const { GoogleGenAI } = await import('@google/genai');
    const OpenAI = (await import('openai')).default;

    if (!global.apiCooldowns) {
      global.apiCooldowns = { gemini1: 0, gemini2: 0, gemini3: 0, gemini4: 0, openai1: 0, openai2: 0 };
    }
    const COOLDOWN_MS = 10 * 60 * 1000;
    const now = () => Date.now();

    const keys = [
      { key: process.env.GEMINI_API_KEY_1, name: 'gemini1', type: 'gemini' },
      { key: process.env.GEMINI_API_KEY_2, name: 'gemini2', type: 'gemini' },
      { key: process.env.GEMINI_API_KEY_3, name: 'gemini3', type: 'gemini' },
      { key: process.env.GEMINI_API_KEY_4, name: 'gemini4', type: 'gemini' },
      { key: process.env.OPENAI_API_KEY_1, name: 'openai1', type: 'openai' },
      { key: process.env.OPENAI_API_KEY_2, name: 'openai2', type: 'openai' },
    ];

    let parsed = null;

    for (const { key, name, type } of keys) {
      if (!key || key.startsWith('your_') || now() < global.apiCooldowns[name]) continue;

      try {
        console.log(`[ShieldNet Batch] Trying ${name} for ${batch.length} posts...`);
        let raw = '';

        if (type === 'gemini') {
          const ai = new GoogleGenAI({ apiKey: key });
          const result = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt
          });
          raw = result.text;
        } else {
          const openai = new OpenAI({ apiKey: key });
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
          });
          // gpt-4o-mini wraps array in object
          const obj = JSON.parse(completion.choices[0].message.content);
          raw = JSON.stringify(obj.results || obj.posts || Object.values(obj)[0] || []);
        }

        parsed = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
        if (!Array.isArray(parsed)) parsed = parsed.results || parsed.posts || null;
        if (Array.isArray(parsed)) {
          console.log(`[ShieldNet Batch] ${name} succeeded for ${parsed.length} posts.`);
          break;
        }
      } catch (err) {
        console.warn(`[ShieldNet Batch] ${name} failed: ${err.message}`);
        if (err.message?.includes('429') || err.message?.includes('quota')) {
          global.apiCooldowns[name] = now() + COOLDOWN_MS;
        }
        parsed = null;
      }
    }

    // ── Map results back to original posts ────────────────────────────────────
    const results = batch.map((p, i) => {
      const verdict = parsed?.[i];
      const fakeScore = verdict?.fakeScore ?? 0;
      return {
        text: p.text,
        author: p.author || 'unknown',
        platform: p.platform || 'other',
        fakeScore,
        verdict: verdict?.verdict ?? 'SAFE',
        confidence: verdict?.confidence ?? 'Low',
        explanation: verdict?.reason ?? 'Analysis complete.',
        flagged: fakeScore >= 35,
        risk_score: fakeScore,
        verified_sources: [],
      };
    });

    // ── Persist flagged posts to MongoDB ─────────────────────────────────────
    for (const r of results.filter(r => r.flagged)) {
      try {
        await new FlaggedPost({
          text: r.text,
          platform: r.platform,
          fakeScore: r.fakeScore,
          confidence: r.confidence === 'High' ? 'High' : r.confidence === 'Medium' ? 'Medium' : 'Low',
          explanation: r.explanation,
          sources: [],
          status: 'pending',
          metadata: { author: r.author, analyzedBy: 'gemini-batch' }
        }).save();
      } catch (dbErr) {
        console.error('[ShieldNet] DB save error:', dbErr.message);
      }
    }

    console.log(`[ShieldNet Batch] Done. Global calls: ${globalCallCount}/${GLOBAL_CALL_LIMIT}`);
    res.status(200).json({ results, callsUsed: globalCallCount, callsMax: GLOBAL_CALL_LIMIT });

  } catch (err) {
    next(err);
  }
};
