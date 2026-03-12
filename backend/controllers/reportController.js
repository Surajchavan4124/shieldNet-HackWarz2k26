import Report from '../models/Report.model.js';
import FlaggedPost from '../models/FlaggedPost.model.js';

export const reportPost = async (req, res, next) => {
  try {
    const { postId, reason } = req.body;
    
    if (!postId || !reason) {
      res.status(400);
      throw new Error('PostId and reason are required');
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
