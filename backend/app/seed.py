from database import collection
from embedder import get_embedding

data = [
    "Steel detailing involves creating detailed drawings for steel structures.",
    "Shop drawings are used by fabricators to manufacture steel components.",
    "Bolted connections are commonly used in structural steel.",
]

for text in data:
    embedding = get_embedding(text)
    collection.insert_one({
        "text": text,
        "embedding": embedding
    })

print("Inserted successfully")
