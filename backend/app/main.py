from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import numpy as np
import re

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your Vite frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# MODELS
# ---------------------------

# Embedding model
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# LLM model (base is more stable than small)
MODEL_NAME = "google/flan-t5-base"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
llm_model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)

# ---------------------------
# DATABASE
# ---------------------------

client = MongoClient("mongodb://localhost:27017")
db = client["steel_rag"]
collection = db["documents"]

# ---------------------------
# SIMILARITY FUNCTION
# ---------------------------

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# ---------------------------
# ROOT ENDPOINT (to avoid 404)
# ---------------------------

@app.get("/")
def root():
    return {
        "message": "Steel RAG API is running",
        "endpoints": {
            "/ask": "GET - Ask a question (use ?question=your question)",
            "/health": "GET - Check system health"
        }
    }

# ---------------------------
# HEALTH CHECK ENDPOINT
# ---------------------------

@app.get("/health")
def health_check():
    try:
        # Check MongoDB connection
        client.admin.command('ping')
        db_status = "connected"
    except:
        db_status = "disconnected"
    
    return {
        "status": "healthy",
        "database": db_status,
        "models": "loaded"
    }

# ---------------------------
# ASK ENDPOINT (REAL RAG)
# ---------------------------

@app.get("/ask")
def ask(question: str):

    # 1️⃣ Embed question
    question_embedding = embed_model.encode(question)

    # 2️⃣ Fetch docs
    docs = list(collection.find({}))

    if not docs:
        return {"answer": "No documents found in database."}

    # 3️⃣ Score similarity
    scored_chunks = []

    for doc in docs:
        chunk_embedding = np.array(doc["embedding"])
        score = cosine_similarity(question_embedding, chunk_embedding)
        scored_chunks.append((score, doc["text"]))

    # 4️⃣ Get Top 3
    top_candidates = sorted(scored_chunks, key=lambda x: x[0], reverse=True)[:3]

    # 5️⃣ Keyword re-ranking
    question_keywords = question.lower().split()

    best_chunk = None
    best_score = -1

    for score, text in top_candidates:
        text_lower = text.lower()
        keyword_score = sum(1 for word in question_keywords if word in text_lower)
        combined_score = score + (0.05 * keyword_score)

        if combined_score > best_score:
            best_score = combined_score
            best_chunk = text

    context = re.sub(r"\s+", " ", best_chunk).strip()

    # 6️⃣ Strict Prompt
    prompt = f"""
You are a strict technical extractor.

From the context below, extract ONLY the exact answer to the question.
Do NOT explain.
Do NOT add extra information.
If not found, return: Answer not found in the document.

Context:
{context}

Question:
{question}

Answer:
"""

    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)

    outputs = llm_model.generate(
        **inputs,
        max_new_tokens=120,
        do_sample=False
    )

    answer = tokenizer.decode(outputs[0], skip_special_tokens=True).strip()

    return {"answer": answer}