from .model import MisinformationDetector

# Initialize the detector as a singleton/global instance for efficiency
detector = MisinformationDetector()
detector.load_model()

def analyze_text(text: str):
    """
    1. Preprocess text (Implicitly handled by tokenizer in predict)
    2. Run PyTorch model
    3. Calculate fake probability
    4. Generate explanation text
    """
    prediction = detector.predict(text)
    
    fake_score = prediction["fake_score"]
    confidence = prediction["confidence"]
    label = prediction["label"]

    # Generate heuristic-based explanation for hackathon purposes
    explanation = ""
    
    if fake_score > 0.7:
        reasons = []
        if any(word in text.lower() for word in ["urgent", "must share", "shovking", "secret"]):
            reasons.append("contains sensationalist or clickbait-style phrasing")
        if len(text.split()) < 10:
            reasons.append("lacks sufficient context or detail")
        if "http" not in text:
            reasons.append("lacks verifiable external sources or links")
            
        if not reasons:
            reasons.append("patterns in the text align with known misinformation trends")
            
        explanation = f"Post flagged as potential misinformation because it {' and '.join(reasons)}."
    else:
        explanation = "The content appears to be consistent with standard neutral reporting or personal sharing."

    return {
        "fake_score": round(fake_score, 4),
        "confidence": round(confidence, 4),
        "explanation": explanation
    }
