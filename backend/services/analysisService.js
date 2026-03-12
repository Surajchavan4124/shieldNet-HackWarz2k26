import { detectMisinformation } from './aiService.js';
import { getSources } from './sourceService.js';
import FlaggedPost from '../models/FlaggedPost.model.js';

export const analyzePost = async (text, platform) => {
  // 1. Call real AI model
  const aiResult = await detectMisinformation(text);
  
  // 2. Fetch external verification sources using Axios
  const sources = await getSources(text);

  const result = {
    fakeScore: aiResult.fakeScore,
    confidence: aiResult.confidence,
    explanation: aiResult.explanation,
    sources: sources
  };

  // 3. Store if the risk score is > threshold (e.g., 70)
  if (result.fakeScore >= 70) {
    const flaggedPost = new FlaggedPost({
      text,
      platform,
      fakeScore: result.fakeScore,
      confidence: result.confidence,
      explanation: result.explanation,
      sources: result.sources,
      status: 'pending'
    });
    
    await flaggedPost.save();
    
    return {
      ...result,
      isFlagged: true,
      flaggedPostId: flaggedPost._id
    };
  }

  return { ...result, isFlagged: false };
};
