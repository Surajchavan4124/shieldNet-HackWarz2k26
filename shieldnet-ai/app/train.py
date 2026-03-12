import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, TrainingArguments, Trainer
from .dataset_loader import load_data
import os

def train():
    model_name = "distilbert-base-uncased"
    output_dir = "./models/fine_tuned_distilbert"
    os.makedirs(output_dir, exist_ok=True)

    print(f"Loading tokenizer and model: {model_name}")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=2)

    print("Loading datasets...")
    train_dataset, val_dataset = load_data("./data/dataset.csv", tokenizer)

    print("Setting up training arguments...")
    # Optimized for a hackathon/local machine (CPU-friendly)
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=3,
        per_device_train_batch_size=4,
        per_device_eval_batch_size=4,
        warmup_steps=10,
        weight_decay=0.01,
        logging_dir="./logs",
        logging_steps=5,
        eval_strategy="steps",
        eval_steps=10,
        save_strategy="steps",
        save_steps=10,
        load_best_model_at_end=True,
    )

    print("Initializing Trainer...")
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
    )

    print("Starting training...")
    trainer.train()

    print(f"Saving fine-tuned model to {output_dir}")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    print("Training complete!")

if __name__ == "__main__":
    train()
