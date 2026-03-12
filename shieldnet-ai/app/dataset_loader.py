import pandas as pd
import torch
from torch.utils.data import Dataset
from transformers import AutoTokenizer

class MisinformationDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_length=512):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = int(self.labels[idx])

        encoding = self.tokenizer.encode_plus(
            text,
            add_special_tokens=True,
            max_length=self.max_length,
            return_token_type_ids=False,
            padding="max_length",
            truncation=True,
            return_attention_mask=True,
            return_tensors="pt",
        )

        return {
            "text": text,
            "input_ids": encoding["input_ids"].flatten(),
            "attention_mask": encoding["attention_mask"].flatten(),
            "labels": torch.tensor(label, dtype=torch.long)
        }

def load_data(file_path, tokenizer, max_length=512, test_size=0.2):
    df = pd.read_csv(file_path)
    
    # Simple train/test split
    from sklearn.model_selection import train_test_split
    df_train, df_val = train_test_split(df, test_size=test_size, random_state=42)
    
    train_dataset = MisinformationDataset(
        texts=df_train.text.to_numpy(),
        labels=df_train.label.to_numpy(),
        tokenizer=tokenizer,
        max_length=max_length
    )
    
    val_dataset = MisinformationDataset(
        texts=df_val.text.to_numpy(),
        labels=df_val.label.to_numpy(),
        tokenizer=tokenizer,
        max_length=max_length
    )
    
    return train_dataset, val_dataset
