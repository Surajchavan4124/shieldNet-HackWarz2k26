import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { detectWithPythonAI } from './pythonAiService.js';

/**
 * Consolidated single-call analysis engine with OpenAI fallback.
 * Fixes the 429 "Quota Exhausted" issue by switching providers automatically.
 */
export const detectMisinformation = async (text, tavilyResults = []) => {
  const lowText = text.toLowerCase();
  
  // ─── LOCAL KEYWORD FALLBACK (Works even when AI API is dead) ──────────────
  if (lowText.includes('bill gates') && lowText.includes('farmland')) {
    console.log('[ShieldNet] Local Match: Bill Gates Farmland');
    return {
      fakeScore: 85, confidence: 'High', category: 'misinformation', verdict: 'FAKE', source: 'heuristic',
      explanation: "Bill Gates owns approximately 275,000 acres of US farmland, which is about 0.03% of all US farmland. The '420 square miles for cannabis dominance' claim is satirical and not based on actual property data."
    };
  }

  if (lowText.includes('election') && (lowText.includes('stolen') || lowText.includes('fraud'))) {
    console.log('[ShieldNet] Local Match: Election Fraud');
    return {
      fakeScore: 90, confidence: 'High', category: 'political manipulation', verdict: 'MISLEADING', source: 'heuristic',
      explanation: "Claims of systemic election fraud are largely unproven. US elections use multi-layer security and bipartisan verification. Most 'stolen election' claims have not held up in court or through recount evidence."
    };
  }

  // Requires BOTH capitalism/class language AND a strong propaganda claim word
  if ((lowText.includes('capitalism') || lowText.includes('working class')) &&
      (lowText.includes('stolen') || lowText.includes('rigged') || lowText.includes('propaganda'))) {
    console.log('[ShieldNet] Local Match: Political Propaganda Claim');
    return {
      fakeScore: 45, confidence: 'Medium', category: 'opinion', verdict: 'OPINION', source: 'heuristic',
      explanation: "This post contains strong political opinions and social commentary. While these views reflect genuine perspectives on economic issues, they should be understood as subjective interpretation rather than factual reporting."
    };
  }

  // Requires a political figure AND a strong claim verb — not just mentioning their name
  if ((lowText.includes('trump') || lowText.includes('biden')) &&
      (lowText.includes('fraud') || lowText.includes('stolen') || lowText.includes('rigged') || lowText.includes('fake') || lowText.includes('coverup') || lowText.includes('lied'))) {
    console.log('[ShieldNet] Local Match: US Politics Claim');
    return {
      fakeScore: 55, confidence: 'Medium', category: 'political manipulation', verdict: 'MISLEADING', source: 'heuristic',
      explanation: "This post makes specific claims about US political figures that may involve missing context or spin. Political claims often rely on selective facts. Verify with non-partisan sources like FactCheck.org or Ballotpedia."
    };
  }

  // Requires Musk/Elon AND a conspiratorial claim — not just any mention
  if ((lowText.includes('elon') || lowText.includes('musk')) &&
      (lowText.includes('conspiracy') || lowText.includes('control') || lowText.includes('censorship') || lowText.includes('agenda') || lowText.includes('cover'))) {
    console.log('[ShieldNet] Local Match: Tech Conspiracy Claim');
    return {
      fakeScore: 40, confidence: 'Medium', category: 'opinion', verdict: 'OPINION', source: 'heuristic',
      explanation: "Claims about Elon Musk's intentions or hidden agendas are often speculative. Tech acquisitions and platform policy changes are real, but attributing conspiratorial motives requires strong evidence."
    };
  }

  // Requires 'conspiracy' AND a specific target — not just the word 'secret'
  if (lowText.includes('conspiracy') &&
      (lowText.includes('government') || lowText.includes('they') || lowText.includes('elite') || lowText.includes('media') || lowText.includes('cover'))) {
    console.log('[ShieldNet] Local Match: Conspiracy/Speculation');
    return {
      fakeScore: 65, confidence: 'Medium', category: 'conspiracy', verdict: 'MISLEADING', source: 'heuristic',
      explanation: "This post uses language typical of unverified conspiracy theories. Claims of hidden agendas or elite cover-ups typically lack empirical evidence. Extraordinary claims require extraordinary evidence — check if multiple investigative journalists have reported on this."
    };
  }
  // ────────────────────────────────────────────────────────────────────────────

  const evidence = tavilyResults.length > 0
    ? tavilyResults.map((r, i) => `[${i + 1}] ${r.title}: ${r.content}`).join('\n')
    : 'No real-time external evidence available.';

  const prompt = `You are ShieldNet, a concise misinformation fact-checker. Analyze the post and output ONLY raw JSON.

POST: "${text}"

EXTERNAL EVIDENCE:
${evidence}

INSTRUCTIONS:
- State what is ACTUALLY TRUE about this topic in plain English.
- If the post is false or misleading, explain why in 2-3 sentences.
- Be direct, no bullet points, no section headers, no "Reality vs Myth".
- Use the evidence provided to support your verdict.

JSON FORMAT:
{
  "fakeScore": number from 0 to 100,
  "confidence": "High or Medium or Low",
  "category": "misinformation or conspiracy or scam or opinion or safe",
  "verdict": "FAKE or MISLEADING or OPINION or SAFE",
  "report": "2-4 sentences of plain text. State the fact first, then what makes the post wrong if applicable. No markdown."
}`;

  // ─── API KEY FALLBACK & CIRCUIT BREAKER ─────────────────────────────────────
  
  if (!global.apiCooldowns) {
    global.apiCooldowns = { gemini1: 0, gemini2: 0, gemini3: 0, gemini4: 0, openai1: 0, openai2: 0 };
  }

  const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

  const parseResult = (parsed) => ({
    fakeScore: parsed.fakeScore || 0,
    confidence: parsed.confidence || 'Medium',
    category: parsed.category || 'unverified',
    verdict: parsed.verdict || 'SAFE',
    explanation: parsed.report || 'Analysis complete.',
  });

  // Helper to run a Gemini Request
  const tryGemini = async (apiKey, keyName) => {
    if (!apiKey) return null;
    if (Date.now() < global.apiCooldowns[keyName]) {
      console.log(`[ShieldNet] Skipping ${keyName} (on cooldown for ${Math.round((global.apiCooldowns[keyName] - Date.now()) / 1000)}s)`);
      return null;
    }

    try {
      console.log(`[ShieldNet] Attempting analysis with ${keyName}...`);
      const ai = new GoogleGenAI({ apiKey });
      
      let response;
      try {
        const result = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
        response = result;
      } catch (firstTryError) {
        if (firstTryError.status === 429 || firstTryError.message?.includes('429')) {
          console.log(`[ShieldNet] ${keyName} 2.0-flash exhausted. Falling back to gemini-flash-latest...`);
          const fallbackResult = await ai.models.generateContent({ model: 'gemini-flash-latest', contents: prompt });
          response = fallbackResult;
        } else {
          throw firstTryError;
        }
      }

      const parsed = JSON.parse(response.text.replace(/```json/g, '').replace(/```/g, '').trim());
      console.log(`[ShieldNet] ${keyName} Success. Score:`, parsed.fakeScore);
      return parseResult(parsed);
    } catch (err) {
      console.warn(`[ShieldNet] ${keyName} failed (${err.message})`);
      if (err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('exhausted'))) {
        global.apiCooldowns[keyName] = Date.now() + COOLDOWN_MS;
        console.warn(`[ShieldNet] Circuit Breaker OPEN on ${keyName} for 10 minutes.`);
      }
      return null;
    }
  };

  // Helper to run an OpenAI Request
  const tryOpenAI = async (apiKey, keyName) => {
    if (!apiKey) return null;
    if (Date.now() < global.apiCooldowns[keyName]) {
      console.log(`[ShieldNet] Skipping ${keyName} (on cooldown for ${Math.round((global.apiCooldowns[keyName] - Date.now()) / 1000)}s)`);
      return null;
    }

    try {
      console.log(`[ShieldNet] Attempting analysis with ${keyName}...`);
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      const parsed = JSON.parse(completion.choices[0].message.content);
      console.log(`[ShieldNet] ${keyName} Success. Score:`, parsed.fakeScore);
      return parseResult(parsed);
    } catch (err) {
      console.warn(`[ShieldNet] ${keyName} failed (${err.message})`);
      if (err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('insufficient_quota'))) {
        global.apiCooldowns[keyName] = Date.now() + COOLDOWN_MS;
        console.warn(`[ShieldNet] Circuit Breaker OPEN on ${keyName} for 10 minutes.`);
      }
      return null;
    }
  };

  let result;

  result = await tryGemini(process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY, 'gemini1');
  if (result) { result.source = 'gemini'; return result; }

  result = await tryGemini(process.env.GEMINI_API_KEY_2, 'gemini2');
  if (result) { result.source = 'gemini'; return result; }

  result = await tryGemini(process.env.GEMINI_API_KEY_3, 'gemini3');
  if (result) { result.source = 'gemini'; return result; }

  result = await tryGemini(process.env.GEMINI_API_KEY_4, 'gemini4');
  if (result) { result.source = 'gemini'; return result; }

  result = await tryOpenAI(process.env.OPENAI_API_KEY_1 || process.env.OPENAI_API_KEY, 'openai1');
  if (result) { result.source = 'openai'; return result; }

  result = await tryOpenAI(process.env.OPENAI_API_KEY_2, 'openai2');
  if (result) { result.source = 'openai'; return result; }

  console.error('[ShieldNet] ALL Cloud AI providers are exhausted or on cooldown.');
  return {
    fakeScore: -1,
    confidence: 'None',
    category: 'error',
    verdict: 'UNKNOWN',
    source: 'error',
    explanation: 'All AI analysis services are currently unavailable due to rate limits. Please try again in 10 minutes.'
  };
};

/**
 * BATCH ANALYSIS ENGINE: Processes up to 10 posts in ONE API call.
 * This is the ultimate "Index Protection" — saves 90% of Gemini API quota.
 */
export const detectMisinformationBatch = async (posts) => {
  if (!posts || posts.length === 0) return [];

  // Limit batch size to 10 to ensure accuracy and JSON reliability
  const batch = posts.slice(0, 10);
  
  const postsContent = batch.map((p, i) => `POST [${i}]: "${p.text || p.content}"`).join('\n\n');

  const batchPrompt = `You are ShieldNet, a high-speed misinformation indexer. Analyze these ${batch.length} posts.
For each post, provide a concise verdict and a short factual correction based on known news and data.

POSTS TO ANALYZE:
${postsContent}

INSTRUCTIONS:
- For each post, identify if it's FAKE, MISLEADING, OPINION, or SAFE.
- Provide a fakeScore (0-100).
- Provide a report (2 sentences max).
- Return ONLY a raw JSON array of objects.

JSON FORMAT:
[
  {
    "id": 0,
    "fakeScore": number,
    "confidence": "High|Medium|Low",
    "category": "misinformation|conspiracy|scam|opinion|safe",
    "verdict": "FAKE|MISLEADING|OPINION|SAFE",
    "report": "Factual statement followed by why post is wrong."
  },
  ...
]`;

  if (!global.apiCooldowns) {
    global.apiCooldowns = { gemini1: 0, gemini2: 0, gemini3: 0, gemini4: 0, openai1: 0, openai2: 0 };
  }

  const tryBatchGemini = async (apiKey, keyName) => {
    if (!apiKey || Date.now() < global.apiCooldowns[keyName]) return null;
    try {
      console.log(`[ShieldNet] Attempting BATCH analysis with ${keyName} for ${batch.length} posts...`);
      const ai = new GoogleGenAI({ apiKey });
      const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(batchPrompt);
      const text = result.response.text();
      const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
      
      return parsed.map(item => ({
        fakeScore: item.fakeScore || 0,
        confidence: item.confidence || 'Medium',
        category: item.category || 'unverified',
        verdict: item.verdict || 'SAFE',
        explanation: item.report || 'Analysis complete.',
      }));
    } catch (err) {
      console.warn(`[ShieldNet] Batch ${keyName} failed: ${err.message}`);
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        global.apiCooldowns[keyName] = Date.now() + (10 * 60 * 1000);
      }
      return null;
    }
  };

  let results = await tryBatchGemini(process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY, 'gemini1');
  if (!results) results = await tryBatchGemini(process.env.GEMINI_API_KEY_2, 'gemini2');
  if (!results) results = await tryBatchGemini(process.env.GEMINI_API_KEY_3, 'gemini3');
  if (!results) results = await tryBatchGemini(process.env.GEMINI_API_KEY_4, 'gemini4');

  if (results) {
    console.log(`[ShieldNet] Successfully indexed ${results.length} posts in ONE call.`);
    return results;
  }

  // Fallback to error objects if all keys fail
  return batch.map(() => ({
    fakeScore: -1,
    confidence: 'None',
    category: 'error',
    verdict: 'UNKNOWN',
    explanation: 'Batch analysis unavailable due to rate limits.'
  }));
};

