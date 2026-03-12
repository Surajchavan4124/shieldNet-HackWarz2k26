import OpenAI from 'openai';

export const detectMisinformationOpenAI = async (text) => {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Analyze the following social media post for misinformation, sensitive content, or inappropriate behavior.
Post: "${text}"

Respond ONLY with a valid JSON object in this exact format:
{
  "fakeScore": <number between 0 and 100>,
  "confidence": "High" | "Medium" | "Low",
  "explanation": "<short paragraph explaining why>"
}`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a content moderation assistant specializing in fact-checking and safety." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content);
        
        // Normalize
        if (result.fakeScore < 0) result.fakeScore = 0;
        if (result.fakeScore > 100) result.fakeScore = 100;
        if (!['High', 'Medium', 'Low'].includes(result.confidence)) {
            result.confidence = 'Medium';
        }

        return result;
    } catch (error) {
        console.error('OpenAI API Error:', error);
        return {
            fakeScore: 0,
            confidence: 'Low',
            explanation: 'OpenAI analysis failed.'
        };
    }
};
