import axios from 'axios';

/**
 * Service to interact with the standalone Python AI backend.
 * Uses the TensorFlow-based DistilBERT model.
 */
export const detectWithPythonAI = async (text) => {
    const PYTHON_AI_URL = 'http://localhost:8000/analyze';
    
    try {
        const response = await axios.post(PYTHON_AI_URL, { text });
        const { fake_score, confidence, explanation } = response.data;
        
        return {
            fakeScore: Math.round(fake_score * 100),
            confidence: confidence >= 0.8 ? 'High' : (confidence >= 0.5 ? 'Medium' : 'Low'),
            explanation: explanation
        };
    } catch (error) {
        console.error('Python AI Service Error:', error.message);
        // Fallback or skip if service is down
        return {
            fakeScore: 0,
            confidence: 'Low',
            explanation: 'Python AI analysis unavailable.'
        };
    }
};
