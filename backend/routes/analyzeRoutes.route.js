import express from 'express';
import { analyzeContent, analyzeBatch } from '../controllers/analyzeController.js';

const router = express.Router();

// POST /api/analyze          — single post (from extension/manual)
router.post('/', analyzeContent);

// POST /api/analyze/batch    — up to 10 posts in ONE Gemini call
router.post('/batch', analyzeBatch);

export default router;
