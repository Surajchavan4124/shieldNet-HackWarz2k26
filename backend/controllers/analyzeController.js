import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import FlaggedPost from '../models/FlaggedPost.model.js';
import { getSources } from '../services/sourceService.js';

// ── Shared Domain Lists (Fact-checks & Trusted News) ──────────────────────────
const FACT_CHECK_DOMAINS = [
  'snopes.com', 'factcheck.org', 'politifact.com', 'reuters.com', 'apnews.com',
  'fullfact.org', 'factly.in', 'boomlive.in', 'thequint.com', 'altnews.in',
  'indiatoday.in/fact-check', 'ndtv.com/fact-check', 'bbc.com/news/reality_check'
];
const TRUSTED_NEWS_DOMAINS = [
  'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'nytimes.com', 'npr.org',
  'wsj.com', 'bloomberg.com', 'theguardian.com', 'washingtonpost.com', 'aljazeera.com',
  'timesofindia.indiatimes.com', 'thehindu.com', 'cnn.com'
];
const FAKE_SIGNALS = ['false', 'fake', 'misleading', 'misinformation', 'debunked', 'hoax', 'claim is fake'];

// ─── Single post (Legacy/Manual) ─────────────────────────────────────────────
import { analyzePost } from '../services/analysisService.js';
export const analyzeContent = async (req, res, next) => {
  try {
    const { text, platform, author, force } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400); throw new Error('Valid text content is required');
    }
    const result = await analyzePost(text.trim(), (platform||'other').toLowerCase(), author||'unknown', force);
    res.status(200).json(result);
  } catch (err) { next(err); }
};

// ─── Robust JSON extractor ───────────────────────────────────────────────────
function extractJsonArray(raw = '') {
  if (!raw) return null;
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    const first = parsed.results || parsed.posts || parsed.data || Object.values(parsed).find(Array.isArray);
    if (Array.isArray(first)) return first;
  } catch (_) {}
  const match = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (match) { try { return JSON.parse(match[0]); } catch (_) {} }
  return null;
}

// ── Rate limiter (100 calls / 5 min) ────────────────────────────────────────
const RATE_WINDOW_MS  = 5 * 60 * 1000;
const RATE_MAX_CALLS  = 100;
let   windowCallCount = 0;
let   windowStart     = Date.now();

function checkRateLimit() {
  const now = Date.now();
  if (now - windowStart >= RATE_WINDOW_MS) {
    windowCallCount = 0; windowStart = now;
    console.log('[ShieldNet] Rate limit window reset.');
  }
  if (windowCallCount >= RATE_MAX_CALLS) return false;
  windowCallCount++;
  return true;
}

export const analyzeBatch = async (req, res, next) => {
  try {
    const { posts } = req.body;
    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ error: 'posts[] array required' });
    }

    const batch = posts.slice(0, 10);
    if (!checkRateLimit()) {
      return res.status(429).json({
        error: 'Rate limit reached (100 calls / 5 min)',
        results: batch.map(p => ({
          text: p.text, fakeScore: 0, verdict: 'SAFE',
          confidence: 'Low', explanation: 'API rate limit reached.', flagged: false
        }))
      });
    }

    // Helper to clean tweet text for better news matching (remove @mentions, hashtags, and short noise)
    const cleanSearchQuery = (t = '') => {
      return t.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '') // remove urls
              .replace(/@[A-Za-z0-9_]+/g, '')             // remove @mentions
              .replace(/#[A-Za-z0-9_]+/g, '')             // remove #hashtags
              .replace(/\s+/g, ' ')                        // collapse whitespace
              .trim().substring(0, 150);                  // focus on main claim
    };

    // ── STEP 1: Parallel News/Fact-Check Confirmation ────────────────────────
    console.log(`[ShieldNet Batch] Verifying ${batch.length} posts against BBC & trusted sources...`);
    const sourcePromises = batch.map(p => getSources(cleanSearchQuery(p.text)));
    const allSources = await Promise.all(sourcePromises);

    const groundTruths = batch.map((p, i) => {
      const { results: tavilyResults, formatted } = allSources[i];
      
      // Fact-check check - improved to look for BBC Verify/Reality Check specifically
      const factCheckHit = tavilyResults.find(r => {
        const url = (r.url || '').toLowerCase();
        const content = ((r.title || '') + ' ' + (r.content || '')).toLowerCase();
        const isFactSource = FACT_CHECK_DOMAINS.some(d => url.includes(d)) || 
                             url.includes('bbc.com/news/verify') || 
                             url.includes('bbc.com/news/reality_check');
        return isFactSource && FAKE_SIGNALS.some(s => content.includes(s));
      });

      // Trusted News check
      const trustedHit = tavilyResults.find(r => {
        const url = (r.url || '').toLowerCase();
        return TRUSTED_NEWS_DOMAINS.some(d => url.includes(d));
      });

      return {
        isFakeConfirmed: !!factCheckHit,
        isSafeConfirmed: !!trustedHit && !factCheckHit,
        evidence: factCheckHit || trustedHit,
        allSources: formatted
      };
    });

    // ── STEP 2: Build Enhanced AI Prompt ─────────────────────────────────────
    const postLines = batch.map((p, i) => {
      const gt = groundTruths[i];
      let evidenceStr = 'NONE';
      if (gt.isFakeConfirmed) evidenceStr = `CONFIRMED FAKE via ${gt.evidence.url}`;
      else if (gt.isSafeConfirmed) evidenceStr = `REPORTED BY TRUSTED NEWS via ${gt.evidence.url}`;
      
      return `POST[${i}]: "${p.text?.substring(0, 300)}" \nEVIDENCE: ${evidenceStr}`;
    }).join('\n\n');

    const prompt = `You are ShieldNet AI. Analyze these ${batch.length} posts using the provided EVIDENCE where available. 

${postLines}

Return a JSON array of ${batch.length} objects:
- id: integer
- fakeScore: 0-100 (High score if EVIDENCE says CONFIRMED FAKE, Low if SAFE)
- verdict: "FAKE" | "MISLEADING" | "SCAM" | "SAFE"
- confidence: "High" | "Medium" | "Low"
- reason: Mention the specific evidence if provided (e.g., "Confirmed as a hoax by BBC Reality Check").

Return ONLY raw JSON, no text.`;

    // ── STEP 3: API Rotation Logic ───────────────────────────────────────────
    if (!global.apiCooldowns) global.apiCooldowns = {};
    const nowMs = () => Date.now();
    const IS_DEV   = process.env.NODE_ENV !== 'production';
    const COOLDOWN = IS_DEV ? 60 * 1000 : 10 * 60 * 1000;

    const keys = [
      ...[1,2,3,4,5,6,7,8,9,10].map(n => ({ key: process.env[`GEMINI_API_KEY_${n}`], name: `gemini${n}`, type: 'gemini' })),
      ...[1,2,3,4].map(n => ({ key: process.env[`OPENAI_API_KEY_${n}`], name: `openai${n}`, type: 'openai' }))
    ].filter(k => k.key && k.key.trim().length > 10);

    keys.forEach(k => { if (!(k.name in global.apiCooldowns)) global.apiCooldowns[k.name] = 0; });

    let parsed = null;
    for (const { key, name, type } of keys) {
      if (nowMs() < global.apiCooldowns[name]) continue;
      try {
        let raw = '';
        if (type === 'gemini') {
          const ai = new GoogleGenAI({ apiKey: key });
          const result = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
          raw = result.text || '';
        } else {
          const openai = new OpenAI({ apiKey: key });
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: 'JSON API.' }, { role: 'user', content: prompt }]
          });
          raw = completion.choices[0].message.content || '';
        }

        parsed = extractJsonArray(raw);
        if (Array.isArray(parsed) && parsed.length > 0) break;
      } catch (err) {
        if (err.message?.includes('429') || err.message?.includes('quota')) {
          global.apiCooldowns[name] = nowMs() + COOLDOWN;
        }
      }
    }

    // ── STEP 4: Final Results Mapping ────────────────────────────────────────
    const results = batch.map((p, i) => {
      const v = parsed?.[i];
      const gt = groundTruths[i];
      let fakeScore = typeof v?.fakeScore === 'number' ? v.fakeScore : 0;
      
      // Force result if News Confirmation was decisive
      if (gt.isFakeConfirmed) fakeScore = Math.max(fakeScore, 90);
      if (gt.isSafeConfirmed) fakeScore = Math.min(fakeScore, 10);

      const finalVerdict = gt.isFakeConfirmed ? 'FAKE' : (gt.isSafeConfirmed ? 'SAFE' : (v?.verdict || 'SAFE'));
      const finalConfidence = (gt.isFakeConfirmed || gt.isSafeConfirmed) ? 'High' : (v?.confidence || 'Low');
      const finalReason = v?.reason || (gt.isFakeConfirmed ? `Confirmed misinformation by ${new URL(gt.evidence.url).hostname}.` : (gt.isSafeConfirmed ? `Verified by ${new URL(gt.evidence.url).hostname}.` : 'Analyzed by ShieldNet AI.'));

      return {
        text:        p.text,
        author:      p.author || 'unknown',
        platform:    p.platform || 'other',
        fakeScore,
        verdict:     finalVerdict,
        confidence:  finalConfidence,
        explanation: finalReason,
        flagged:     fakeScore >= 30,
        risk_score:  fakeScore,
        verified_sources: gt.allSources,
      };
    });

    // ── STEP 5: DB Save & Respond ────────────────────────────────────────────
    const flagged = results.filter(r => r.flagged);
    for (const r of flagged) {
      try {
        await new FlaggedPost({
          text: r.text, platform: r.platform, fakeScore: r.fakeScore,
          confidence: r.confidence === 'High' ? 'High' : (r.confidence === 'Medium' ? 'Medium' : 'Low'),
          explanation: r.explanation, sources: r.verified_sources, status: 'pending',
          metadata: { author: r.author, analyzedBy: 'shieldnet-pipeline' }
        }).save();
      } catch (e) {}
    }

    res.status(200).json({ results, callsUsed: windowCallCount, callsMax: RATE_MAX_CALLS });

  } catch (err) { next(err); }
};
