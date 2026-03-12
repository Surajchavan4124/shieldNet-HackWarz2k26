import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np
import os

class MisinformationDetector:
    def __init__(self, model_name: str = "distilbert-base-uncased"):
        self.model_name = model_name
        self.tokenizer = None
        self.model = None

    def load_model(self):
        """
        Load the pretrained model and tokenizer using PyTorch.
        Prioritizes a locally fine-tuned model if available.
        """
        local_model_path = "./models/fine_tuned_distilbert"
        if os.path.exists(local_model_path):
            print(f"Loading locally fine-tuned model from {local_model_path}")
            model_to_load = local_model_path
        else:
            print(f"Local model not found. Loading base model: {self.model_name}")
            model_to_load = self.model_name

        self.tokenizer = AutoTokenizer.from_pretrained(model_to_load)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_to_load, num_labels=2)
        print(f"Model {self.model_name} (PyTorch) loaded successfully.")

    def predict(self, text: str):
        """
        Run inference on the input text using PyTorch.
        """
        if self.model is None or self.tokenizer is None:
            self.load_model()

        # Set to evaluation mode
        self.model.eval()

        # Tokenize inputs
        inputs = self.tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
        
        # Disable gradient calculation for inference
        with torch.no_grad():
            outputs = self.model(**inputs)
        
        # Apply softmax to get probabilities
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1).numpy()[0]
        
        # Assuming label 1 is 'fake' and label 0 is 'real'
        fake_score = float(probs[1])
        real_score = float(probs[0])
        
        label = "fake" if fake_score > real_score else "real"
        confidence = float(max(fake_score, real_score))

        return {
            "fake_score": fake_score,
            "confidence": confidence,
            "label": label
        }
