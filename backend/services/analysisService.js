import { detectMisinformation } from './aiService.js';
import { detectMisinformationOpenAI } from './openaiService.js';
import { detectMisinformationHF } from './hfService.js';
import { detectWithPythonAI } from './pythonAiService.js';
import { getSources } from './sourceService.js';
import FlaggedPost from '../models/FlaggedPost.model.js';

export const analyzePost = async (text, platform) => {
  console.log(`[Analysis] Starting multi-AI pipeline for platform: ${platform}`);
  
  // 1. Run parallel AI analysis
  const [geminiRes, openaiRes, hfRes, pythonAiRes, sources] = await Promise.all([
    detectMisinformation(text).catch(e => ({ fakeScore: 0, confidence: 'Low', explanation: 'Failed: ' + e.message })),
    detectMisinformationOpenAI(text).catch(e => ({ fakeScore: 0, confidence: 'Low', explanation: 'Failed: ' + e.message })),
    detectMisinformationHF(text).catch(e => ({ fakeScore: 0, confidence: 'Low', explanation: 'Failed: ' + e.message })),
    detectWithPythonAI(text).catch(e => ({ fakeScore: 0, confidence: 'Low', explanation: 'Failed: ' + e.message })),
    getSources(text).catch(() => [])
  ]);

  console.log(`[AI Results] Gemini: ${geminiRes.fakeScore}, OpenAI: ${openaiRes.fakeScore}, HF: ${hfRes.fakeScore}, Python: ${pythonAiRes.fakeScore}`);

  // 2. Aggregate Results
  const validResults = [];
  if (geminiRes.explanation && !geminiRes.explanation.startsWith('Failed')) validResults.push(geminiRes);
  if (openaiRes.explanation && !openaiRes.explanation.startsWith('Failed') && openaiRes.explanation !== 'OpenAI analysis failed.') validResults.push(openaiRes);
  if (pythonAiRes.explanation && !pythonAiRes.explanation.startsWith('Failed') && pythonAiRes.explanation !== 'Python AI analysis unavailable.') validResults.push(pythonAiRes);
  
  // Scoring Logic:
  // Primary (Misinformation): Gemini, OpenAI, and Python AI avg
  let primaryScore = 0;
  const primaryModels = validResults;
  if (primaryModels.length > 0) {
    primaryScore = primaryModels.reduce((acc, r) => acc + r.fakeScore, 0) / primaryModels.length;
  } else {
    primaryScore = geminiRes.fakeScore; 
  }

  // If HF detects high toxicity, boost the score
  let finalScore = primaryScore;
  if (hfRes.fakeScore > 50 && hfRes.fakeScore > finalScore) {
    finalScore = (finalScore * 0.7) + (hfRes.fakeScore * 0.3);
  }

  const aggregatedScore = Math.round(finalScore);

  // Take the most comprehensive explanation
  const bestExplanation = pythonAiRes.fakeScore >= geminiRes.fakeScore && pythonAiRes.fakeScore >= openaiRes.fakeScore 
    ? pythonAiRes.explanation 
    : (geminiRes.fakeScore >= openaiRes.fakeScore ? geminiRes.explanation : openaiRes.explanation);
  
  // Highest confidence wins
  const confMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
  const sortedByConf = [geminiRes, openaiRes, hfRes, pythonAiRes].sort((a, b) => confMap[b.confidence] - confMap[a.confidence]);
  const finalConfidence = sortedByConf[0].confidence;

  const result = {
    fakeScore: aggregatedScore,
    confidence: finalConfidence,
    explanation: bestExplanation,
    sources: sources,
    breakdown: {
      gemini: geminiRes.fakeScore,
      openai: openaiRes.fakeScore,
      hf: hfRes.fakeScore,
      python: pythonAiRes.fakeScore
    }
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
      status: 'pending',
      metadata: {
        aiBreakdown: result.breakdown
      }
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
