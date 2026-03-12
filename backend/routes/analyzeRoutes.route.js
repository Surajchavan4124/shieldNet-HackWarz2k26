import express from 'express';
import { analyzeContent } from '../controllers/analyzeController.js';

const router = express.Router();

// @route   POST /api/analyze
// @desc    Analyze text for misinformation and save if flagged
// @access  Public (from extension)
router.post('/', analyzeContent);

export default router;
