# ShieldNet AI: Misinformation Detection Backend

This is the Python-based AI backend for ShieldNet, designed to detect misinformation in social media posts using TensorFlow and HuggingFace Transformers.

## Features
- **FastAPI**: High-performance async API server.
- **TensorFlow & Transformers**: DistilBERT model for sequence classification.
- **Explainable AI**: Heuristic-based explanation for risk scores.

## Project Structure
```text
shieldnet-ai
│
├ app
│   ├ main.py      # API Server Entry Point
│   ├ model.py     # TensorFlow Model Loader
│   ├ inference.py # Analysis Logic
│   └ schemas.py   # Pydantic Data Models
│
├ requirements.txt # Project Dependencies
└ README.md        # Documentation
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Train the Model (Optional)**
   If you want to train the model on your custom data in `data/dataset.csv`:
   ```bash
   python -m app.train
   ```
   This will save the model to `models/fine_tuned_distilbert`.

3. **Run Server**
   ```bash
   uvicorn app.main:app --reload
   ```

3. **Test API**
   - **Endpoint**: `POST http://localhost:8000/analyze`
   - **Payload**:
     ```json
     {
       "text": "Your social media post content here"
     }
     ```
   - **Output**:
     ```json
     {
       "fake_score": 0.82,
       "confidence": 0.91,
       "explanation": "..."
     }
     ```
