import express from 'express';
import Report from '../models/Report.model.js';

const router = express.Router();

// @route   POST /api/report
// @desc    Report suspicious content
// @access  Public (from extension/app)
router.post('/', async (req, res) => {
  try {
    const { post_id, reason } = req.body;

    if (!post_id || !reason) {
      return res.status(400).json({ message: 'Post ID and reason are required' });
    }

    // Check if the report already exists for this post and reason combination
    let report = await Report.findOne({ post_id, report_reason: reason });

    if (report) {
      // Increment the count if it exists
      report.report_count += 1;
    } else {
      // Create a new report
      report = new Report({
        post_id,
        report_reason: reason
      });
    }

    await report.save();

    res.status(200).json({ message: 'Post reported successfully', report });
  } catch (error) {
    console.error('Reporting error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
