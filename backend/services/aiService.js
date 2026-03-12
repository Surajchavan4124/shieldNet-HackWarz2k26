/**
 * Mock AI Service for ShieldNet
 * In production, this will connect to OpenAI, Google Gemini, Hugging Face, etc.
 */

export const analyzeContent = async (text, platform) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  console.log(`Analyzing content from ${platform}: "${text.substring(0, 50)}..."`);

  // Simple mock logic based on keywords
  const lowerText = text.toLowerCase();
  
  let fake_probability = 15; // default low probability
  let explanation = "This post appears to be sharing standard user content without significant verifiable claims.";
  let sources = [];
  
  if (lowerText.includes('flat earth') || lowerText.includes('chip') || lowerText.includes('fake')) {
    fake_probability = 85;
    explanation = "This post contains known conspiracy theories or unsubstantiated claims. Multiple fact-checking organizations have debunked these statements.";
    sources = [
      { title: "Fact Check: The Earth is not flat", url: "https://example.com/fact-check-1" },
      { title: "Scientific Consensus on vaccines", url: "https://example.com/science" }
    ];
  } else if (lowerText.includes('cure') || lowerText.includes('miracle')) {
    fake_probability = 65;
    explanation = "This post makes strong health or medical claims that may require verification. Always consult healthcare professionals.";
    sources = [
      { title: "Medical Guidelines", url: "https://example.com/medical-guidelines" }
    ];
  }

  return {
    fake_probability,
    explanation,
    sources
  };
};
