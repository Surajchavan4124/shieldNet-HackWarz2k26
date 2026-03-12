from app.dataset_loader import load_data
from transformers import AutoTokenizer

def test_dataset():
    tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")
    train_dataset, _ = load_data("./data/dataset.csv", tokenizer)
    
    print(f"Dataset length: {len(train_dataset)}")
    try:
        item = train_dataset[0]
        print("Successfully retrieved first item.")
        print("Keys:", item.keys())
    except Exception as e:
        print(f"Error retrieving item: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_dataset()
