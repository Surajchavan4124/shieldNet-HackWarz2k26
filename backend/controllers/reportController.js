import Report from '../models/Report.model.js';
import FlaggedPost from '../models/FlaggedPost.model.js';

export const reportPost = async (req, res, next) => {
  try {
    const { postId, reason } = req.body;
    
    if (!postId || typeof postId !== 'string' || postId.trim().length === 0) {
      res.status(400);
      throw new Error('Valid Post ID is required');
    }
    
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
       res.status(400);
       throw new Error('Valid report reason is required');
    }

    const report = new Report({ postId, reason });
    await report.save();

    const post = await FlaggedPost.findByIdAndUpdate(postId, { $inc: { reportCount: 1 } }, { new: true });

    if (!post) {
      res.status(404);
      throw new Error('Flagged post not found');
    }

    res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (error) {
    next(error);
  }
};
