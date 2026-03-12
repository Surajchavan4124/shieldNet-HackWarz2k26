import express from 'express';
import { analyzeContent } from '../services/aiService.js';
import FlaggedPost from '../models/FlaggedPost.model.js';

const router = express.Router();

// @route   POST /api/analyze
// @desc    Analyze text for misinformation and save if flagged
// @access  Public (from extension/app)
router.post('/', async (req, res) => {
  try {
    const { text, platform } = req.body;

    if (!text || !platform) {
      return res.status(400).json({ message: 'Text and platform are required' });
    }

    // Call the AI Service
    const analysisResult = await analyzeContent(text, platform);

    // If probability is high, save to database for moderation
    if (analysisResult.fake_probability >= 70) {
      const flaggedPost = new FlaggedPost({
        post_text: text,
        platform_source: platform,
        fake_probability: analysisResult.fake_probability,
        explanation: analysisResult.explanation,
        sources: analysisResult.sources,
        status: 'pending'
      });

      await flaggedPost.save();

      // Return the ID of the flagged post along with the analysis so users can report it later if needed
      return res.status(200).json({
        ...analysisResult,
        flagged_post_id: flaggedPost._id,
        is_flagged: true
      });
    }

    res.status(200).json({
      ...analysisResult,
      is_flagged: false
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
