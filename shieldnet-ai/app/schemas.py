from pydantic import BaseModel
from typing import Optional

class AnalyzeRequest(BaseModel):
    text: str

class AnalyzeResponse(BaseModel):
    fake_score: float
    confidence: float
    explanation: str
