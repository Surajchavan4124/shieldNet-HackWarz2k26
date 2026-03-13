import express from 'express';
import { getPosts, refreshPosts, getPostsStatus } from '../controllers/postsController.js';

const router = express.Router();

// @route   GET /api/posts
// @desc    Fetch up to 300 real Reddit posts with AI analysis scores
// @query   ?limit=N  ?refresh=true  ?onlyFlagged=true
// @access  Public (dashboard + extension)
router.get('/', getPosts);

// @route   POST /api/posts/refresh
// @desc    Force-clears Reddit + analysis cache — triggers fresh fetch on next GET
// @access  Public (dashboard refresh button)
router.post('/refresh', refreshPosts);

// @route   GET /api/posts/status
// @desc    Returns cache metadata (count, timestamps, subreddits)
// @access  Public (dashboard status indicator)
router.get('/status', getPostsStatus);

export default router;
