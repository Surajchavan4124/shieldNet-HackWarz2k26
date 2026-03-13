import { fetchRedditPosts, invalidateRedditCache, getRedditCacheInfo } from '../services/redditService.js';
import { analyzePost, batchAnalyzePosts, checkNewsVerification } from '../services/analysisService.js';

/**
 * ShieldNet Posts Controller
 *
 * GET  /api/posts          → returns cached + analysed posts
 * POST /api/posts/refresh  → force-clears cache and re-fetches from Reddit
 * GET  /api/posts/status   → returns cache metadata
 *
 * Analysis strategy (saves API calls):
 *  1. Fetch up to 300 real Reddit posts
 *  2. Run a LOCAL keyword scorer on every post — instant, free
 *  3. Only posts with local score ≥ LOCAL_THRESHOLD get sent to Gemini
 *  4. Multiple Gemini keys rotate automatically (via existing aiService.js)
 *  5. Everything is cached in memory for 1 hour
 */

// ─── In-memory analysis cache ────────────────────────────────────────────────
// Maps post.id → full analysis result so we never re-analyse the same post.
const analysisCache = new Map();

// Local-only threshold: posts below this are marked Safe without any API call
const LOCAL_THRESHOLD = 0.40;

// ─── Local keyword scorer (mirrors background.js logic) ──────────────────────
const MISINFO_SIGNALS = {
  high: [
    /\bfake news\b/i, /\bhoax\b/i, /\bscam alert\b/i,
    /\bthey don'?t want you to know\b/i, /\bwake up people\b/i,
    /\bshare before (it'?s )?deleted\b/i, /\bdeep.?state\b/i,
    /\bgovernment (is )?hiding\b/i, /\bplandemic\b/i,
    /\bcrisis actor(s)?\b/i, /\bfalse flag\b/i, /\bcabal\b/i,
    /\b(cures?|killed?) cancer\b/i, /\bbig pharma\b/i,
    /\bvaccine (causes?|gave me)\b/i, /\b5g (causes?|spread(s|ing)?)\b/i,
  ],
  medium: [
    /\bbreaking:?\b/i, /\burgent:?\b/i, /\bexclusive:?\b/i,
    /\bconspiracy\b/i, /\belites?\b/i, /\bnew world order\b/i,
    /\bthey'?re lying\b/i, /\bthe truth about\b/i,
    /\b100%\s*(proven|confirmed|effective)\b/i,
    /\bno one is talking about\b/i, /\bcensored\b/i, /\bsuppressed\b/i,
    /\bexposed\b/i,
  ],
  claims: [
    /\bscientists? (prove[sd]?|confirm(ed)?|found)\b/i,
    /\bstudies? (show|prove|confirm)\b/i,
    /\baccording to (sources?|insiders?|whistleblowers?)\b/i,
    /\b(leaked|classified) document(s)?\b/i,
    /\bmiracle cure\b/i, /\bnaturally (cure|treat|heal)\b/i,
  ],
  emotional: [
    /!{2,}/, /\bOMG\b/i, /\bshocking\b/i,
    /\boutrageous\b/i, /\bmust (see|watch|read|share)\b/i, /\bviral\b/i,
  ],
};

function localScore(text) {
  if (!text || text.trim().length < 20) return 0;
  let score = 0;
  for (const p of MISINFO_SIGNALS.high)     if (p.test(text)) score += 0.20;
  for (const p of MISINFO_SIGNALS.medium)   if (p.test(text)) score += 0.10;
  for (const p of MISINFO_SIGNALS.claims)   if (p.test(text)) score += 0.08;
  for (const p of MISINFO_SIGNALS.emotional) if (p.test(text)) score += 0.05;
  // ALL-CAPS boost
  const words = text.split(/\s+/).filter(w => w.length > 3);
  if (words.length > 0) {
    const capsRatio = words.filter(w => w === w.toUpperCase() && /[A-Z]/.test(w)).length / words.length;
    if (capsRatio > 0.4) score += 0.10;
  }
  return Math.min(score, 1.0);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function statusFromScore(fakeScore) {
  if (fakeScore >= 70) return { status: 'Flagged',      statusVariant: 'danger' };
  if (fakeScore >= 40) return { status: 'Under Review', statusVariant: 'warning' };
  return               { status: 'Cleared',      statusVariant: 'success' };
}

function buildSafeResult(post, localScoreValue) {
  const fakeScore = Math.round(localScoreValue * 100);
  return {
    ...post,
    fakeScore,
    aiConfidence: Math.round(40 + localScoreValue * 20), // 40–60% local only
    verdict: 'SAFE',
    explanation: 'Local pre-filter: content appears safe. No API call needed.',
    analyzed: true,
    analyzedBy: 'local',
    ...statusFromScore(fakeScore),
  };
}

function buildApiResult(post, apiResult) {
  const fakeScore = apiResult.fakeScore ?? 0;
  const aiConfidence = Math.min(
    100,
    Math.round((apiResult.breakdown?.gemini || apiResult.breakdown?.openai || fakeScore) * 0.9 + 10)
  );
  return {
    ...post,
    fakeScore,
    aiConfidence,
    verdict: apiResult.verdict || 'SAFE',
    explanation: apiResult.explanation || '',
    confidence: apiResult.confidence || 'Medium',
    verified_sources: apiResult.verified_sources || [],
    isDeep: apiResult.isDeep || false,
    analyzed: true,
    analyzedBy: apiResult.breakdown ? 'gemini' : 'local',
    breakdown: apiResult.breakdown || null,
    ...statusFromScore(fakeScore),
  };
}

// ─── Controller: GET /api/posts ───────────────────────────────────────────────
/**
 * Fetches posts from Reddit cache, then:
 *  - Returns already-analysed posts immediately from analysisCache
 *  - Runs local scorer on unanalysed posts
 *  - Sends borderline posts to Gemini (with key rotation)
 *  - Responds with the full enriched list
 *
 * Query params:
 *   ?limit=N        — cap returned posts (default 300)
 *   ?refresh=true   — force Reddit re-fetch
 *   ?onlyFlagged=true — only return posts with fakeScore >= 35
 */
export const getPosts = async (req, res, next) => {
  try {
    const limit       = Math.min(parseInt(req.query.limit) || 300, 300);
    const forceRefresh = req.query.refresh === 'true';
    const onlyFlagged  = req.query.onlyFlagged === 'true';

    // 1. Get raw Reddit posts (from cache or fresh fetch)
    const rawPosts = await fetchRedditPosts(forceRefresh);
    const posts = rawPosts.slice(0, limit);

    console.log(`[ShieldNet] Processing ${posts.length} posts...`);

    // 2. Separate: already-analysed vs new
    const toAnalyse = [];
    const results = [];

    for (const post of posts) {
      if (analysisCache.has(post.id)) {
        results.push(analysisCache.get(post.id));
      } else {
        toAnalyse.push(post);
      }
    }

    console.log(`[ShieldNet] ${results.length} from analysis cache, ${toAnalyse.length} new posts to process.`);

    // 3. Run local scorer on each new post — decide if API call needed
    const apiNeeded = [];
    for (const post of toAnalyse) {
      const score = localScore(post.content);
      if (score < LOCAL_THRESHOLD) {
        const safe = buildSafeResult(post, score);
        analysisCache.set(post.id, safe);
        results.push(safe);
      } else {
        apiNeeded.push({ post, localScore: score });
      }
    }

    console.log(`[ShieldNet] ${apiNeeded.length} posts escalated to Gemini.`);

    // 4. Analyse border-line posts via BATCH INDEXING (Fast & Quota Efficient)
    // We process these in chunks of 10 to fit in ONE Gemini API call
    const BATCH_SIZE = 10;
    for (let i = 0; i < apiNeeded.length; i += BATCH_SIZE) {
      const chunk = apiNeeded.slice(i, i + BATCH_SIZE).map(item => ({
        text: item.post.content,
        author: item.post.author,
        id: item.post.id,
        platform: item.post.platform
      }));

      try {
        // Run batch analysis on the chunk
        const batchResults = await batchAnalyzePosts(chunk);
        
        // Merge results back into the final list
        batchResults.forEach((enrichedBatchPost, index) => {
          const originalPost = apiNeeded[i + index].post;
          const finalPost = {
            ...originalPost,
            ...enrichedBatchPost,
            ...statusFromScore(enrichedBatchPost.fakeScore)
          };
          analysisCache.set(originalPost.id, finalPost);
          results.push(finalPost);
        });
      } catch (err) {
        console.warn(`[ShieldNet] Batch analysis failed for chunk ${i}: ${err.message}`);
        // Fallback for this chunk
        apiNeeded.slice(i, i + BATCH_SIZE).forEach(({ post }) => {
          const fallback = buildSafeResult(post, 0.5);
          analysisCache.set(post.id, fallback);
          results.push(fallback);
        });
      }
    }

    // 5. Sort by fakeScore descending (most dangerous first)
    results.sort((a, b) => (b.fakeScore || 0) - (a.fakeScore || 0));

    const filtered = onlyFlagged
      ? results.filter(p => (p.fakeScore || 0) >= 35)
      : results;

    console.log(`[ShieldNet] Returning ${filtered.length} posts.`);

    res.status(200).json({
      total: filtered.length,
      cached: results.length - toAnalyse.length,
      freshlyAnalysed: toAnalyse.length,
      posts: filtered,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Controller: POST /api/posts/refresh ────────────────────────────────────
export const refreshPosts = async (req, res, next) => {
  try {
    invalidateRedditCache();
    analysisCache.clear();
    res.status(200).json({ message: 'Cache cleared. Next GET /api/posts will re-fetch from Reddit.' });
  } catch (err) {
    next(err);
  }
};

// ─── Controller: GET /api/posts/status ──────────────────────────────────────
export const getPostsStatus = async (req, res, next) => {
  try {
    const info = getRedditCacheInfo();
    res.status(200).json({
      ...info,
      analysedCount: analysisCache.size,
    });
  } catch (err) {
    next(err);
  }
};
