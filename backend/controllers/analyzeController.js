import { analyzePost } from '../services/analysisService.js';

export const analyzeContent = async (req, res, next) => {
  try {
    const { text, platform } = req.body;
    
    if (!text || !platform) {
      res.status(400);
      throw new Error('Text and platform are required');
    }

    const result = await analyzePost(text, platform);
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
