import { analyzePost } from '../services/analysisService.js';

export const analyzeContent = async (req, res, next) => {
  try {
    const { text, platform } = req.body;
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400);
      throw new Error('Valid text content is required for analysis');
    }

    const validPlatforms = ['reddit', 'instagram', 'facebook', 'twitter', 'other'];
    if (!platform || !validPlatforms.includes(platform.toLowerCase())) {
      res.status(400);
      throw new Error(`Valid platform is required. Allowed values are: ${validPlatforms.join(', ')}`);
    }

    const result = await analyzePost(text, platform.toLowerCase());
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
