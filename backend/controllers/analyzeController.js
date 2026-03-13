import { analyzePost } from '../services/analysisService.js';

export const analyzeContent = async (req, res, next) => {
  try {
    const { text, platform, author, force } = req.body;
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400);
      throw new Error('Valid text content is required for analysis');
    }

    const safePlatform = platform && typeof platform === 'string'
      ? platform.toLowerCase()
      : 'other';

    const safeAuthor = author || 'unknown';

    console.log(`[ShieldNet] Analyze request — platform: ${safePlatform}, author: ${safeAuthor}${force ? ' (FORCED)' : ''}`);

    const result = await analyzePost(text.trim(), safePlatform, safeAuthor, force);
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
