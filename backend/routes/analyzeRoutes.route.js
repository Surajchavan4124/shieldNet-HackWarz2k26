import express from 'express';
import { analyzeContent, analyzeBatch } from '../controllers/analyzeController.js';

const router = express.Router();

// POST /api/analyze           — single post (from extension/manual)
router.post('/', analyzeContent);

// POST /api/analyze/batch     — up to 10 posts in ONE Gemini call
router.post('/batch', analyzeBatch);

// POST /api/analyze/reset  — dev: clear ALL circuit breaker cooldowns instantly
router.post('/reset', (req, res) => {
  if (global.apiCooldowns) {
    Object.keys(global.apiCooldowns).forEach(k => global.apiCooldowns[k] = 0);
  }
  const active = [
    ...[1,2,3,4,5,6,7,8,9,10].map(n => process.env[`GEMINI_API_KEY_${n}`] ? `gemini${n}` : null),
    ...[1,2,3,4].map(n => process.env[`OPENAI_API_KEY_${n}`] ? `openai${n}` : null),
  ].filter(Boolean);
  res.json({ message: 'All cooldowns reset.', activeKeys: active, cooldowns: global.apiCooldowns });
});

export default router;
