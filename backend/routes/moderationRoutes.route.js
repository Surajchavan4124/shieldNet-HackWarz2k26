import express from 'express';
import FlaggedPost from '../models/FlaggedPost.model.js';
import ModerationLog from '../models/ModerationLog.model.js';

const router = express.Router();

// @route   GET /api/moderation/posts
// @desc    Get flagged posts (pending review)
// @access  Private (Dashboard) - In production requires authentication
router.get('/posts', async (req, res) => {
  try {
    const status = req.query.status || 'pending';

    // Fetch posts, default sorted by creation date
    const posts = await FlaggedPost.find({ status }).sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    console.error('Fetch flagged posts error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/moderation/action
// @desc    Log a moderation action on a flagged post
// @access  Private (Dashboard) - In production requires authentication
router.post('/action', async (req, res) => {
  try {
    const { post_id, decision } = req.body;

    if (!post_id || !decision) {
      return res.status(400).json({ message: 'Post ID and decision are required' });
    }

    // Must be a valid action
    if (!['review', 'remove', 'ignore'].includes(decision)) {
      return res.status(400).json({ message: 'Invalid decision type' });
    }

    // Update Flagged Post status
    let mappedStatus = 'pending';
    if (decision === 'remove') mappedStatus = 'removed';
    if (decision === 'ignore' || decision === 'review') mappedStatus = 'reviewed';

    const post = await FlaggedPost.findByIdAndUpdate(post_id, { status: mappedStatus }, { new: true });

    if (!post) {
      return res.status(404).json({ message: 'Flagged post not found' });
    }

    // Create a log entry
    const modLog = new ModerationLog({
      post_id,
      action_type: decision,
      moderator_decision: `Status updated to ${mappedStatus}`
    });

    await modLog.save();

    res.status(200).json({ message: 'Moderation action logged successfully', post });
  } catch (error) {
    console.error('Moderation action error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
