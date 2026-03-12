import { GoogleGenAI } from '@google/genai';

export const detectMisinformation = async (text) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `Analyze the following social media post for misinformation or misleading claims.
Post: "${text}"

Respond ONLY with a valid JSON object in this exact format:
{
  "fakeScore": <number between 0 and 100>,
  "confidence": "<High, Medium, or Low>",
  "explanation": "<short paragraph explaining why>"
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let jsonString = response.text;
    
    // Clean up potential markdown formatting from the response
    jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const result = JSON.parse(jsonString);
    
    // Safety check constraints
    if (result.fakeScore < 0) result.fakeScore = 0;
    if (result.fakeScore > 100) result.fakeScore = 100;
    if (!['High', 'Medium', 'Low'].includes(result.confidence)) {
      result.confidence = 'Medium';
    }

    return result;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to analyze content with AI. ' + error.message);
  }
};
