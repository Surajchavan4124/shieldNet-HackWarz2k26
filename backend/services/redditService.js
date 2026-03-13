import axios from 'axios';

/**
 * ShieldNet Reddit Service
 * Fetches real posts from Reddit's free public JSON API.
 * No API key required — uses the public *.json endpoint.
 *
 * Pulls from multiple subreddits defined in env (REDDIT_SUBREDDITS)
 * and caches up to REDDIT_POST_LIMIT posts for REDDIT_CACHE_TTL_MS ms.
 */

// ─── In-memory cache ─────────────────────────────────────────────────────────
let cachedPosts = [];
let cacheTimestamp = 0;

const TTL = parseInt(process.env.REDDIT_CACHE_TTL_MS) || 60 * 60 * 1000; // 1 hour
const TOTAL_LIMIT = parseInt(process.env.REDDIT_POST_LIMIT) || 300;

// Subreddits to fetch from — configurable via env
const SUBREDDITS = (process.env.REDDIT_SUBREDDITS || 'worldnews,news,politics,conspiracy,science,technology')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// How many posts to pull per subreddit (distributed across subreddits)
function perSubredditLimit() {
  return Math.ceil(TOTAL_LIMIT / SUBREDDITS.length);
}

// ─── Platform colour map ──────────────────────────────────────────────────────
const PLATFORM_COLORS = {
  worldnews:   { bg: 'bg-blue-100',   text: 'text-blue-700' },
  news:        { bg: 'bg-slate-100',  text: 'text-slate-700' },
  politics:    { bg: 'bg-purple-100', text: 'text-purple-700' },
  conspiracy:  { bg: 'bg-red-100',    text: 'text-red-700' },
  science:     { bg: 'bg-green-100',  text: 'text-green-700' },
  technology:  { bg: 'bg-cyan-100',   text: 'text-cyan-700' },
  india:       { bg: 'bg-orange-100', text: 'text-orange-700' },
  health:      { bg: 'bg-teal-100',   text: 'text-teal-700' },
};

function platformColor(subreddit) {
  const c = PLATFORM_COLORS[subreddit.toLowerCase()];
  return c
    ? `${c.bg} ${c.text}`
    : 'bg-gray-100 text-gray-600';
}

// ─── Fetch from one subreddit ─────────────────────────────────────────────────
async function fetchSubreddit(subreddit, limit = 50) {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}&raw_json=1`;

  try {
    const { data } = await axios.get(url, {
      headers: {
        // Reddit requires a non-default user-agent for the JSON API
        'User-Agent': 'ShieldNet/1.0 (HackWarz misinformation detector)',
      },
      timeout: 8000,
    });

    const children = data?.data?.children || [];

    return children
      .filter(child => {
        const post = child.data;
        // Skip stickied/pinned mod posts and empty titles
        return post && !post.stickied && post.title && post.title.length > 10;
      })
      .map(child => {
        const post = child.data;
        const title = post.title || '';
        const body = post.selftext?.replace(/&amp;/g, '&')
                                   .replace(/&lt;/g, '<')
                                   .replace(/&gt;/g, '>')
                                   .substring(0, 300) || '';
        const content = body ? `${title}. ${body}` : title;

        // Relative timestamp
        const created = new Date(post.created_utc * 1000);
        const diffMs = Date.now() - created.getTime();
        const diffH = Math.floor(diffMs / (1000 * 60 * 60));
        const diffD = Math.floor(diffH / 24);
        const timestamp = diffH < 1
          ? 'just now'
          : diffH < 24
            ? `${diffH}h ago`
            : `${diffD}d ago`;

        return {
          id: post.id,
          content,
          title,
          body,
          author: post.author || 'unknown',
          platform: `r/${subreddit}`,
          platformColor: platformColor(subreddit),
          subreddit,
          url: `https://reddit.com${post.permalink}`,
          reports: post.num_comments || 0,
          upvotes: post.ups || 0,
          timestamp,

          // These fields get populated by the analysis pipeline
          fakeScore: null,
          aiConfidence: null,
          verdict: null,
          status: 'Pending',
          statusVariant: 'default',
          explanation: null,
          analyzed: false,
        };
      });
  } catch (err) {
    console.warn(`[ShieldNet] Reddit fetch failed for r/${subreddit}: ${err.message}`);
    return [];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Returns up to REDDIT_POST_LIMIT real Reddit posts.
 * Uses in-memory cache — only hits Reddit if cache has expired.
 *
 * @param {boolean} forceRefresh — bypass cache
 * @returns {Promise<Array>}
 */
export async function fetchRedditPosts(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && cachedPosts.length > 0 && now - cacheTimestamp < TTL) {
    console.log(`[ShieldNet] Reddit cache hit — ${cachedPosts.length} posts (expires in ${Math.round((TTL - (now - cacheTimestamp)) / 60000)}m)`);
    return cachedPosts;
  }

  console.log(`[ShieldNet] Fetching posts from ${SUBREDDITS.length} subreddits: ${SUBREDDITS.join(', ')}`);
  const limit = perSubredditLimit();

  // Fetch all subreddits in parallel
  const batches = await Promise.all(SUBREDDITS.map(sub => fetchSubreddit(sub, limit)));

  // Flatten, dedupe by id, cap at total limit
  const seen = new Set();
  const all = [];
  for (const batch of batches) {
    for (const post of batch) {
      if (!seen.has(post.id)) {
        seen.add(post.id);
        all.push(post);
        if (all.length >= TOTAL_LIMIT) break;
      }
    }
    if (all.length >= TOTAL_LIMIT) break;
  }

  cachedPosts = all;
  cacheTimestamp = now;

  console.log(`[ShieldNet] Reddit fetch complete — ${all.length} posts cached.`);
  return all;
}

/**
 * Force-invalidates the in-memory cache so the next call re-fetches.
 */
export function invalidateRedditCache() {
  cachedPosts = [];
  cacheTimestamp = 0;
  console.log('[ShieldNet] Reddit post cache cleared.');
}

/**
 * Returns current cache metadata (for dashboard status endpoints).
 */
export function getRedditCacheInfo() {
  return {
    count: cachedPosts.length,
    cachedAt: cacheTimestamp ? new Date(cacheTimestamp).toISOString() : null,
    expiresAt: cacheTimestamp
      ? new Date(cacheTimestamp + TTL).toISOString()
      : null,
    subreddits: SUBREDDITS,
    limit: TOTAL_LIMIT,
  };
}
