import express from 'express';
import { getFlaggedPosts, moderatePostAction } from '../controllers/moderationController.js';

const router = express.Router();

// @route   GET /api/moderation/flagged
// @desc    Get flagged posts (pending review)
// @access  Private (Dashboard)
router.get('/flagged', getFlaggedPosts);

// @route   POST /api/moderation/action
// @desc    Log a moderation action on a flagged post
// @access  Private (Dashboard)
router.post('/action', moderatePostAction);

export default router;
