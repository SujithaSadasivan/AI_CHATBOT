import pdfplumber
import re
from sentence_transformers import SentenceTransformer
from pymongo import MongoClient
import os

# ---------------------------
# MODEL
# ---------------------------
model = SentenceTransformer("all-MiniLM-L6-v2")

# ---------------------------
# DATABASE
# ---------------------------
client = MongoClient("mongodb://localhost:27017")
db = client["steel_rag"]
collection = db["documents"]


# ---------------------------
# TEXT EXTRACTION
# ---------------------------
def extract_text_from_txt(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def extract_text_from_pdf(file_path):
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
    return text


# ---------------------------
# CLEAN SECTION (AFTER SPLIT)
# ---------------------------
def clean_section(text):
    text = re.sub(r'\(cid:\d+\)', '', text)
    text = re.sub(r'-\n', '', text)
    text = re.sub(r'[ \t]+', ' ', text)  # keep newlines intact
    return text.strip()


# ---------------------------
# SECTION-BASED CHUNKING
# ---------------------------
def chunk_by_sections(text):
    """
    Splits by numbered headings like:
    1. Introduction
    2. Types of Drawings
    """

    # IMPORTANT: do NOT remove newlines before this
    sections = re.split(r'(?=\n?\d+\.\s)', text)

    cleaned_sections = []

    for section in sections:
        section = section.strip()

        if len(section) < 80:
            continue

        section = clean_section(section)

        # If section too large, split into subchunks
        if len(section) > 1200:
            sub_chunks = [
                section[i:i+800]
                for i in range(0, len(section), 700)
            ]
            cleaned_sections.extend(sub_chunks)
        else:
            cleaned_sections.append(section)

    return cleaned_sections


# ---------------------------
# INGESTION
# ---------------------------
def ingest(file_path):

    print("🧹 Cleaning old data...")
    collection.delete_many({"source": os.path.basename(file_path)})

    print("📖 Extracting text...")

    if file_path.endswith(".txt"):
        text = extract_text_from_txt(file_path)
    elif file_path.endswith(".pdf"):
        text = extract_text_from_pdf(file_path)
    else:
        print("Unsupported file type")
        return

    print("✂ Section-based chunking...")
    chunks = chunk_by_sections(text)

    print("🧠 Generating embeddings & storing...")

    for chunk in chunks:
        embedding = model.encode(chunk).tolist()

        collection.insert_one({
            "text": chunk,
            "embedding": embedding,
            "source": os.path.basename(file_path)
        })

    print("✅ Ingestion complete.")
    print(f"📦 Stored {len(chunks)} sections.")


if __name__ == "__main__":
    ingest("data/Steel_Detailing_Essentials.pdf")