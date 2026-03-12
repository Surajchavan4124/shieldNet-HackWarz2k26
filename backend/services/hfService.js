import { HfInference } from '@huggingface/inference';

export const detectMisinformationHF = async (text) => {
    if (!process.env.HF_API_KEY) {
        throw new Error('HF_API_KEY environment variable is not set');
    }

    const hf = new HfInference(process.env.HF_API_KEY);

    try {
        // Using a toxicity/safety model as a proxy for inappropriate/sensitive detection
        // Model: unitary/toxic-bert (very common for this task)
        const classification = await hf.textClassification({
            model: 'unitary/toxic-bert',
            inputs: text
        });

        // Map toxicity scores to a fakeScore/risk score
        // unitary/toxic-bert returns labels like: toxic, severe_toxic, obscene, threat, insult, identity_hate
        const highRiskLabels = ['toxic', 'severe_toxic', 'threat', 'identity_hate'];
        let maxScore = 0;
        
        classification.forEach(label => {
            if (highRiskLabels.includes(label.label) && label.score > maxScore) {
                maxScore = label.score;
            }
        });

        const riskScore = Math.round(maxScore * 100);

        return {
            fakeScore: riskScore,
            confidence: 'Medium',
            explanation: riskScore > 50 ? 'Content detected as potentially toxic or harmful by specialized BERT model.' : 'No significant toxicity detected by BERT model.'
        };
    } catch (error) {
        console.error('Hugging Face API Error:', error);
        return {
            fakeScore: 0,
            confidence: 'Low',
            explanation: 'Hugging Face analysis failed.'
        };
    }
};
