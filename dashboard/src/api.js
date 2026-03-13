const BASE = 'http://localhost:8080/api';

// ─── Existing endpoints (unchanged) ──────────────────────────────────────────

export const getFlaggedPosts = async () => {
    const response = await fetch(`${BASE}/moderation/flagged`);
    if (!response.ok) throw new Error('Failed to fetch flagged posts');
    return response.json();
};

export const moderatePost = async (postId, action) => {
    const response = await fetch(`${BASE}/moderation/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action })
    });
    if (!response.ok) throw new Error('Failed to perform moderation action');
    return response.json();
};

// ─── New: Reddit-backed posts API ────────────────────────────────────────────

/**
 * Fetch real Reddit posts, scored by AI.
 * @param {object} opts
 * @param {number}  opts.limit       - max posts to return (default 300)
 * @param {boolean} opts.refresh     - force Reddit + analysis cache clear
 * @param {boolean} opts.onlyFlagged - only return posts with fakeScore >= 35
 */
export const getPosts = async ({ limit = 300, refresh = false, onlyFlagged = false } = {}) => {
    const params = new URLSearchParams();
    if (limit)       params.set('limit', limit);
    if (refresh)     params.set('refresh', 'true');
    if (onlyFlagged) params.set('onlyFlagged', 'true');

    const response = await fetch(`${BASE}/posts?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch posts');
    return response.json(); // { total, cached, freshlyAnalysed, posts: [...] }
};

/**
 * Force-refresh the Reddit post cache.
 */
export const refreshPosts = async () => {
    const response = await fetch(`${BASE}/posts/refresh`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to refresh posts');
    return response.json();
};

/**
 * Get cache metadata (count, timestamps, subreddits).
 */
export const getPostsStatus = async () => {
    const response = await fetch(`${BASE}/posts/status`);
    if (!response.ok) throw new Error('Failed to get posts status');
    return response.json();
};
