import FlaggedPost from '../models/FlaggedPost.model.js';
import ModerationLog from '../models/ModerationLog.model.js';

export const getFlaggedPosts = async (req, res, next) => {
  try {
    const posts = await FlaggedPost.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    next(error);
  }
};

export const moderatePostAction = async (req, res, next) => {
  try {
    const { postId, action } = req.body;
    
    if (!postId || !action) {
      res.status(400);
      throw new Error('Post ID and action are required');
    }

    const validActions = ['mark_safe', 'remove_content', 'ignore_flag'];
    if (!validActions.includes(action)) {
      res.status(400);
      throw new Error('Invalid moderation action');
    }

    let mappedStatus = 'pending';
    if (action === 'mark_safe' || action === 'ignore_flag') mappedStatus = 'safe';
    if (action === 'remove_content') mappedStatus = 'removed';

    const post = await FlaggedPost.findByIdAndUpdate(postId, { status: mappedStatus }, { new: true });
    
    if (!post) {
      res.status(404);
      throw new Error('Flagged post not found');
    }

    const log = new ModerationLog({ 
      postId, 
      action 
    });
    await log.save();

    res.status(200).json({ message: `Action ${action} executed successfully`, post });
  } catch (error) {
    next(error);
  }
};
