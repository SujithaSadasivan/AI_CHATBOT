from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from typing import List

# Import auth modules
from app.auth import (
    authenticate_user, create_access_token, get_password_hash,
    get_current_active_user, User, UserCreate, UserInDB, Token, UserLogin,
    users_collection, ACCESS_TOKEN_EXPIRE_MINUTES
)

# Rest of your existing imports
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import numpy as np
import re

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# AUTHENTICATION ENDPOINTS
# ---------------------------

@app.post("/api/register", response_model=User)
async def register(user: UserCreate):
    # Check if user exists
    existing_user = users_collection.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    existing_email = users_collection.find_one({"email": user.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user with hashed password
    hashed_password = get_password_hash(user.password)
    
    user_dict = {
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "hashed_password": hashed_password,
        "disabled": False,
        "created_at": datetime.utcnow()
    }
    
    result = users_collection.insert_one(user_dict)
    
    return User(
        username=user.username,
        email=user.email,
        full_name=user.full_name
    )
@app.post("/api/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/login/json")
async def login_json(user: UserLogin):
    authenticated_user = authenticate_user(user.username, user.password)
    if not authenticated_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": authenticated_user.username}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": authenticated_user.username,
            "email": authenticated_user.email,
            "full_name": authenticated_user.full_name
        }
    }

@app.get("/api/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

# ---------------------------
# MODELS
# ---------------------------

# Embedding model
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# LLM model
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
# ROOT ENDPOINT
# ---------------------------

@app.get("/")
def root():
    return {
        "message": "Steel RAG API is running",
        "endpoints": {
            "/ask": "GET - Ask a question",
            "/health": "GET - Check system health",
            "/api/register": "POST - Register new user",
            "/api/login": "POST - Login user (form)",
            "/api/login/json": "POST - Login user (JSON)",
            "/api/users/me": "GET - Get current user"
        }
    }

# ---------------------------
# HEALTH CHECK
# ---------------------------

@app.get("/health")
def health_check():
    try:
        client.admin.command('ping')
        db_status = "connected"
    except:
        db_status = "disconnected"
    
    # Check users collection
    users_count = users_collection.count_documents({})
    
    return {
        "status": "healthy",
        "database": db_status,
        "users": users_count,
        "models": "loaded"
    }

# ---------------------------
# ASK ENDPOINT
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