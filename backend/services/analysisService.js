import { detectMisinformation } from './aiService.js';
import { detectMisinformationOpenAI } from './openaiService.js';
import { detectMisinformationHF } from './hfService.js';
import { detectWithPythonAI } from './pythonAiService.js';
import { getSources } from './sourceService.js';
import FlaggedPost from '../models/FlaggedPost.model.js';

// Simple in-memory cache to avoid re-analyzing identical posts
const analysisCache = new Map();
// In-flight deduplication: tracks requests currently being processed to avoid
// parallel duplicate API calls caused by the extension scanning the same post multiple times.
const inFlight = new Map();

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

export const analyzePost = async (text, platform, author = 'unknown', force = false) => {
  const cacheKey = simpleHash(text + (force ? '_force' : ''));

  // Return cached result if available (prevents duplicate API calls)
  if (analysisCache.has(cacheKey) && !force) {
    console.log('[ShieldNet] Cache hit for post:', text.substring(0, 50));
    return analysisCache.get(cacheKey);
  }

  // In-flight deduplication: if this exact text is already being processed,
  // wait for that result rather than spawning a duplicate API chain.
  if (inFlight.has(cacheKey) && !force) {
    console.log('[ShieldNet] In-flight hit — awaiting existing analysis:', text.substring(0, 50));
    return inFlight.get(cacheKey);
  }

  // Register this analysis as in-flight
  let resolveInflight;
  const inflightPromise = new Promise(r => { resolveInflight = r; });
  inFlight.set(cacheKey, inflightPromise);

  // ─────────────────────────────────────────────────────────────────
  // Step 1: PRIMARY GATEKEEPER - Local Python AI (shieldnet-ai)
  // ─────────────────────────────────────────────────────────────────
  console.log(`[Analysis] Running Local Python AI pre-check for: ${platform}`);
  const pythonResult = await detectWithPythonAI(text).catch(() => ({ fakeScore: 0, confidence: 'Low', explanation: 'Failed to reach local AI' }));
  
  const LOCAL_SUSPICION_THRESHOLD = 55; // Raised from 35 → 55 to significantly reduce Cloud API calls

  if (pythonResult.fakeScore < LOCAL_SUSPICION_THRESHOLD && !force) {
      console.log(`[ShieldNet] Local AI deemed post Safe (Score: ${pythonResult.fakeScore}). SKIPPING Cloud APIs.`);
      
      const safeResult = {
        platform,
        author,
        post_text: text,
        risk_score: pythonResult.fakeScore,
        fakeScore: pythonResult.fakeScore,
        confidence: pythonResult.confidence,
        category: 'normal',
        explanation: pythonResult.explanation || 'Local AI analysis indicates this content is safe.',
        flagged: false,
        verified_sources: [],
        breakdown: {
            python: pythonResult.fakeScore,
            gemini: 0,
            openai: 0,
            hf: 0
        }
      };
      
      analysisCache.set(cacheKey, safeResult);
      setTimeout(() => analysisCache.delete(cacheKey), 60 * 60 * 1000);
      inFlight.delete(cacheKey);
      resolveInflight(safeResult);
      return safeResult;
  }

  // ─────────────────────────────────────────────────────────────────
  // Step 2: DEEP DIVE - Cloud APIs (Gemini -> OpenAI) + Web Citations
  // ─────────────────────────────────────────────────────────────────
  console.log(`[ShieldNet] Local AI Flagged (Score: ${pythonResult.fakeScore}). TRIGGERING Cloud APIs for deep dive...`);
  
  console.log(`[ShieldNet] Fetching sources for: "${text.substring(0, 40)}..."`);
  const startTime = Date.now();
  const { results: tavilyResults, formatted: formattedSources } = await getSources(text).catch(() => ({ results: [], formatted: [] }));
  console.log(`[ShieldNet] Sources fetched in ${Date.now() - startTime}ms. Count: ${formattedSources.length}`);

  // ─────────────────────────────────────────────────────────────────
  // Step 2b: FACT-CHECK DOMAIN GATE
  // If Tavily returned results from a known fact-check site that clearly
  // say the claim is false/fake/misleading, we skip Gemini entirely.
  // This saves paid API quota and is actually MORE accurate (real fact-checkers).
  // ─────────────────────────────────────────────────────────────────
  const FACT_CHECK_DOMAINS = [
    'snopes.com', 'factcheck.org', 'politifact.com', 'reuters.com',
    'apnews.com', 'fullfact.org', 'factly.in', 'boomlive.in',
    'thequint.com', 'vishvasnews.com', 'pib.gov.in', 'pibfactcheck',
    'altnews.in', 'thelogicalindian.com', 'indiatoday.in/fact-check',
    'ndtv.com/fact-check', 'bbc.com/news/reality_check'
  ];
  const FAKE_SIGNALS = ['false', 'fake', 'misleading', 'misinformation', 'debunked',
    'no evidence', 'unverified', 'fabricated', 'altered', 'manipulated', 'hoax', 'claim is fake'];

  const factCheckHit = tavilyResults.find(r => {
    const url = (r.url || '').toLowerCase();
    const content = ((r.title || '') + ' ' + (r.content || '')).toLowerCase();
    const isFactChecker = FACT_CHECK_DOMAINS.some(d => url.includes(d));
    const hasFakeSignal = FAKE_SIGNALS.some(s => content.includes(s));
    return isFactChecker && hasFakeSignal;
  });

  if (factCheckHit) {
    console.log(`[ShieldNet] Fact-check domain hit: ${factCheckHit.url} — SKIPPING Gemini.`);
    const fcResult = {
      platform, author, post_text: text,
      risk_score: 85,
      fakeScore: 85,
      confidence: 'High',
      category: 'misinformation',
      verdict: 'FAKE',
      explanation: `This claim has been debunked by ${new URL(factCheckHit.url).hostname}. ${factCheckHit.content?.substring(0, 300) || ''}`,
      flagged: true,
      isDeep: true,
      verified_sources: formattedSources.length > 0 ? formattedSources : [{ title: factCheckHit.title, url: factCheckHit.url }],
      breakdown: { python: pythonResult.fakeScore, gemini: 0, openai: 0, hf: 0, factCheck: 85 }
    };
    analysisCache.set(cacheKey, fcResult);
    setTimeout(() => analysisCache.delete(cacheKey), 60 * 60 * 1000);
    inFlight.delete(cacheKey);
    resolveInflight(fcResult);
    return fcResult;
  }

  // ─────────────────────────────────────────────────────────────────
  // Step 2c: CONSENSUS CHECK (MULTI-SOURCE VERIFICATION)
  // If credible mainstream/science news is reporting on it and it wasn't
  // debunked above, it's likely a real news event. Skip Gemini.
  // ─────────────────────────────────────────────────────────────────
  const TRUSTED_NEWS_DOMAINS = [
    'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk',
    'nytimes.com', 'npr.org', 'wsj.com', 'bloomberg.com',
    'ft.com', 'economist.com', 'theguardian.com', 'washingtonpost.com',
    'aljazeera.com', 'pbs.org', 'cbsnews.com', 'nbcnews.com', 'thehindu.com',
    'theverge.com', 'techcrunch.com', 'space.com', 'nature.com', 'scientificamerican.com'
  ];

  const trustedHits = tavilyResults.filter(r => {
    const url = (r.url || '').toLowerCase();
    return TRUSTED_NEWS_DOMAINS.some(d => url.includes(d));
  });

  if (trustedHits.length > 0) {
    console.log(`[ShieldNet] Consensus Check: ${trustedHits.length} trusted sources found. SKIPPING Gemini.`);
    const isHigh = trustedHits.length >= 3;
    const score = isHigh ? 5 : 20;
    
    const consensusResult = {
      platform, author, post_text: text,
      risk_score: score,
      fakeScore: score,
      confidence: isHigh ? 'High' : 'Medium',
      category: 'safe',
      verdict: 'SAFE',
      explanation: isHigh 
        ? `High credibility consensus. Found ${trustedHits.length} trusted news sources reporting on this story.`
        : `Likely credible. Found ${trustedHits.length} trusted news source(s) mentioning this topic.`,
      flagged: false,
      isDeep: true,
      verified_sources: formattedSources.length > 0 ? formattedSources : trustedHits.map(h => ({ title: h.title, url: h.url })),
      breakdown: { python: pythonResult.fakeScore, gemini: 0, openai: 0, hf: 0, consensus: score }
    };

    analysisCache.set(cacheKey, consensusResult);
    setTimeout(() => analysisCache.delete(cacheKey), 60 * 60 * 1000);
    inFlight.delete(cacheKey);
    resolveInflight(consensusResult);
    return consensusResult;
  }

  // ─────────────────────────────────────────────────────────────────
  // Step 2d: ESCALATE TO CLOUD AI (Gemini/OpenAI)
  // ─────────────────────────────────────────────────────────────────
  console.log(`[ShieldNet] No fact-check or consensus found. Escalating to AI analysis...`);
  const aiStartTime = Date.now();
  const verdict = await detectMisinformation(text, tavilyResults);
  console.log(`[ShieldNet] AI analysis complete in ${Date.now() - aiStartTime}ms. Score: ${verdict.fakeScore}`);


  // Combine local and cloud results
  const result = {
    platform, author, post_text: text,
    risk_score: verdict.fakeScore >= 0 ? Math.round((pythonResult.fakeScore + verdict.fakeScore) / 2) : pythonResult.fakeScore,
    fakeScore: verdict.fakeScore >= 0 ? Math.round((pythonResult.fakeScore + verdict.fakeScore) / 2) : pythonResult.fakeScore,
    confidence: verdict.confidence !== 'None' ? verdict.confidence : pythonResult.confidence,
    category: verdict.category !== 'error' ? verdict.category : (pythonResult.fakeScore >= 55 ? 'misinformation' : 'suspicious'),
    verdict: verdict.verdict || (verdict.fakeScore >= 70 ? 'FAKE' : verdict.fakeScore >= 40 ? 'MISLEADING' : 'SAFE'),
    explanation: verdict.explanation || 'Analysis complete.',
    flagged: verdict.fakeScore >= 35 || pythonResult.fakeScore >= 35,
    isDeep: true,
    verified_sources: formattedSources.length > 0 ? formattedSources : getDefaultSources(verdict.category || 'normal'),
    breakdown: verdict.breakdown || {
        python: pythonResult.fakeScore,
        gemini: verdict.source === 'gemini' ? verdict.fakeScore : 0,
        openai: verdict.source === 'openai' ? verdict.fakeScore : 0,
        hf: 0
    }
  };

  // 3. Store if the risk score is > threshold (e.g., 35)
  if (result.flagged || force) {
    const flaggedPost = new FlaggedPost({
      text,
      platform,
      fakeScore: result.fakeScore,
      confidence: result.confidence,
      explanation: result.explanation,
      sources: result.verified_sources,
      status: 'pending',
      metadata: {
        aiBreakdown: result.breakdown
      }
    });
    
    try {
      await flaggedPost.save();
      result.flaggedPostId = flaggedPost._id;
      console.log('[ShieldNet] Flagged post saved to DB:', flaggedPost._id);
    } catch (dbErr) {
      console.error('[ShieldNet] DB save failed (non-fatal):', dbErr.message);
    }
  }

  // Cache result for this session (60 min TTL)
  analysisCache.set(cacheKey, result);
  setTimeout(() => analysisCache.delete(cacheKey), 60 * 60 * 1000);

  // Resolve in-flight promise so any waiting parallel calls get the result
  inFlight.delete(cacheKey);
  resolveInflight(result);

  return result;
  }


function getDefaultSources(category) {
  const defaults = {
    'health misinformation': [
      { title: 'WHO: Health Myths Debunked', url: 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/advice-for-public/myth-busters' },
      { title: 'CDC Health Information', url: 'https://www.cdc.gov/' },
    ],
    'political manipulation': [
      { title: 'FactCheck.org', url: 'https://www.factcheck.org/' },
      { title: 'PolitiFact', url: 'https://www.politifact.com/' },
    ],
    'scam': [
      { title: 'FTC: Avoid Scams', url: 'https://consumer.ftc.gov/articles/how-avoid-social-media-scams' },
      { title: 'FBI: Common Scams', url: 'https://www.fbi.gov/scams-and-safety/common-scams-and-crimes' },
    ],
    'conspiracy': [
      { title: 'Snopes Fact Checks', url: 'https://www.snopes.com/' },
      { title: 'Reuters Fact Check', url: 'https://www.reuters.com/fact-check/' },
    ],
    'safe': [],
  };
  return defaults[category] || [{ title: 'Reuters Fact Check', url: 'https://www.reuters.com/fact-check/' }];
}
