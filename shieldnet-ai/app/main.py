from fastapi import FastAPI, HTTPException
from .schemas import AnalyzeRequest, AnalyzeResponse
from .inference import analyze_text

app = FastAPI(
    title="ShieldNet AI",
    description="Misinformation Detection API for Social Media Posts",
    version="1.0.0"
)

@app.get("/")
def read_root():
    return {"message": "ShieldNet AI Backend is running."}

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest):
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text content cannot be empty.")
            
        result = analyze_text(request.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
