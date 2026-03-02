from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from typing import List, Optional
from bson import ObjectId
from app.routers import admin  # Import admin router

# Import auth modules
from app.auth import (
    authenticate_user, create_access_token, get_password_hash,
    get_current_active_user, User, UserCreate, UserInDB, UserLogin, Token,
    users_collection, ACCESS_TOKEN_EXPIRE_MINUTES, user_to_response
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
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Added both ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# DATABASE CONNECTION
# ---------------------------

client = MongoClient("mongodb://localhost:27017")
db = client["steel_rag"]

# Collections
documents_collection = db["documents"]
chat_sessions_collection = db["chat_sessions"]
chat_messages_collection = db["chat_messages"]
users_collection = db["users"]  # Make sure users collection is defined

# Create indexes for chat collections
try:
    chat_sessions_collection.create_index([("user_id", 1), ("created_at", -1)])
    chat_messages_collection.create_index([("chat_id", 1), ("timestamp", 1)])
    users_collection.create_index("username", unique=True)
    users_collection.create_index("email", unique=True)
    print("✅ Chat collections indexes created")
except Exception as e:
    print(f"⚠️ Index creation warning: {e}")

print("✅ MongoDB Connected Successfully")

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
# SIMILARITY FUNCTION
# ---------------------------

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# ---------------------------
# HELPER FUNCTION FOR BULLET POINTS
# ---------------------------

def format_as_bullet_points(text: str, question: str = "") -> str:
    """
    Convert plain text into proper bullet point format with sub-heading
    Format: 
    Sub-heading (derived from question)
    • Point 1
    • Point 2
    • Point 3
    """
    if not text:
        return text
    
    # Clean the text
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Generate sub-heading from question
    sub_heading = ""
    question_lower = question.lower()
    
    if "types of drawings" in question_lower or "types of drawing" in question_lower:
        sub_heading = "Types of Drawings"
    elif "detailing standards" in question_lower or "standards and codes" in question_lower or "codes" in question_lower:
        sub_heading = "Detailing Standards & Codes"
    elif "erection process" in question_lower or "erection" in question_lower:
        sub_heading = "Erection Process"
    elif "steel detailing" in question_lower and ("what is" in question_lower or "define" in question_lower):
        sub_heading = "Introduction to Steel Detailing"
    elif "structural members" in question_lower or "common members" in question_lower or "members" in question_lower:
        sub_heading = "Common Structural Members"
    elif "edge distance" in question_lower or "minimum edge" in question_lower or "pitch distance" in question_lower:
        sub_heading = "Minimum Edge Distance"
    elif "welding" in question_lower or "weld" in question_lower or "welding essentials" in question_lower:
        sub_heading = "Welding Essentials"
    elif "reading" in question_lower and "drawings" in question_lower:
        sub_heading = "Reading Structural Drawings"
    elif "quality" in question_lower and ("checks" in question_lower or "check" in question_lower):
        sub_heading = "Quality Checks in Detailing"
    elif "fabrication" in question_lower:
        sub_heading = "Fabrication Process"
    elif "bolt" in question_lower or "connection" in question_lower:
        sub_heading = "Bolts & Connections"
    else:
        # Extract first few words from question as sub-heading (capitalized)
        words = question.split()[:4]
        sub_heading = ' '.join(words).title()
        if len(sub_heading) > 30:
            sub_heading = sub_heading[:30] + "..."
    
    # Extract bullet points from text
    bullet_points = []
    
    # Special handling for "Types of Drawings"
    if "General Arrangement" in text or "GA Drawings" in text or "Shop Drawings" in text or "Erection Drawings" in text:
        if "General Arrangement" in text:
            ga_match = re.search(r'General Arrangement[^.]*', text)
            if ga_match:
                bullet_points.append(f"• {ga_match.group(0)}")
        if "Shop Drawings" in text:
            shop_match = re.search(r'Shop Drawings[^.]*', text)
            if shop_match:
                bullet_points.append(f"• {shop_match.group(0)}")
        if "Erection Drawings" in text:
            erec_match = re.search(r'Erection Drawings[^.]*', text)
            if erec_match:
                bullet_points.append(f"• {erec_match.group(0)}")
    
    # Special handling for "Detailing Standards & Codes"
    elif "AISC" in text or "IS 800" in text or "AWS" in text or "OSHA" in text:
        if "AISC" in text:
            bullet_points.append("• AISC – American Institute of Steel Construction")
        if "IS 800" in text:
            bullet_points.append("• IS 800 – Indian Standard for Steel Structures")
        if "AWS" in text:
            bullet_points.append("• AWS – Welding standards")
        if "OSHA" in text:
            bullet_points.append("• OSHA – Safety regulations during erection")
    
    # Special handling for "Common Structural Members"
    elif "Beams" in text or "Columns" in text or "Bracings" in text or "Base Plates" in text:
        sentences = text.split('.')
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence and len(sentence) > 5:
                if "Beams" in sentence:
                    bullet_points.append(f"• {sentence}")
                elif "Columns" in sentence:
                    bullet_points.append(f"• {sentence}")
                elif "Bracings" in sentence or "Bracing" in sentence:
                    bullet_points.append(f"• {sentence}")
                elif "Base Plates" in sentence or "Base Plate" in sentence:
                    bullet_points.append(f"• {sentence}")
    
    # Special handling for "Minimum Edge Distance" and "Welding Essentials"
    elif "edge distance" in text.lower() or "pitch distance" in text.lower() or "fillet weld" in text.lower() or "groove weld" in text.lower():
        # Split by common patterns
        parts = re.split(r'(?<=[.!?])\s+', text)
        for part in parts:
            part = part.strip()
            if part and len(part) > 5:
                # Remove leading numbers like "1.", "8.", etc.
                part = re.sub(r'^\d+\.\s*', '', part)
                bullet_points.append(f"• {part}")
    
    # Special handling for "Reading Structural Drawings" and "Quality Checks"
    elif "grid lines" in text.lower() or "verify" in text.lower() or "check" in text.lower() or "ensure" in text.lower():
        sentences = text.split('.')
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence and len(sentence) > 10:
                bullet_points.append(f"• {sentence}")
    
    # Default handling - split by sentences and clean
    else:
        # First try to split by common patterns
        if "•" in text:
            # Already has bullets, just clean them
            lines = text.split('•')
            for line in lines:
                line = line.strip()
                if line and len(line) > 3:
                    bullet_points.append(f"• {line}")
        else:
            # Split by sentences
            sentences = re.split(r'(?<=[.!?])\s+', text)
            for sentence in sentences:
                sentence = sentence.strip()
                if sentence and len(sentence) > 10:
                    # Remove any leading numbers like "1.", "8.", etc.
                    sentence = re.sub(r'^\d+\.\s*', '', sentence)
                    bullet_points.append(f"• {sentence}")
    
    # Remove duplicates
    seen = set()
    unique_bullets = []
    for bullet in bullet_points:
        if bullet not in seen:
            seen.add(bullet)
            unique_bullets.append(bullet)
    
    # Combine sub-heading and bullet points
    if unique_bullets:
        result = f"{sub_heading}\n" + '\n'.join(unique_bullets)
        return result
    else:
        # If no bullet points found, return as is
        return text

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
        "is_admin": False,  # Regular users are not admins by default
        "created_at": datetime.utcnow()
    }
    
    result = users_collection.insert_one(user_dict)
    
    return User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        is_admin=False
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
        "user": user_to_response(authenticated_user)
    }

@app.get("/api/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

# ---------------------------
# CHAT ENDPOINTS
# ---------------------------

@app.get("/chat/sessions")
async def get_chat_sessions(user_id: str = Query(...)):
    """Get all chat sessions for a user"""
    try:
        print(f"Fetching sessions for user: {user_id}")
        sessions = list(chat_sessions_collection.find(
            {"user_id": user_id}
        ).sort("created_at", -1))
        
        # Convert ObjectId to string
        for session in sessions:
            session["_id"] = str(session["_id"])
            # Convert datetime to ISO format for JSON serialization
            if "created_at" in session and isinstance(session["created_at"], datetime):
                session["created_at"] = session["created_at"].isoformat()
            if "updated_at" in session and isinstance(session["updated_at"], datetime):
                session["updated_at"] = session["updated_at"].isoformat()
        
        print(f"Found {len(sessions)} sessions")
        return sessions
    except Exception as e:
        print(f"Error fetching sessions: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/chat/create")
async def create_chat_session(session_data: dict):
    """Create a new chat session"""
    try:
        print(f"Creating chat session for user: {session_data.get('user_id')}")
        
        # Validate user_id exists
        if not session_data.get("user_id"):
            raise HTTPException(status_code=400, detail="user_id is required")
        
        session = {
            "user_id": session_data["user_id"],
            "title": session_data.get("title", "New Chat"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = chat_sessions_collection.insert_one(session)
        session["_id"] = str(result.inserted_id)
        
        # Convert datetime to ISO format
        session["created_at"] = session["created_at"].isoformat()
        session["updated_at"] = session["updated_at"].isoformat()
        
        print(f"Chat session created with ID: {session['_id']}")
        return session
    except Exception as e:
        print(f"Error creating chat session: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/chat/{chat_id}")
async def get_chat_session(chat_id: str):
    """Get a specific chat session"""
    try:
        print(f"Fetching chat session: {chat_id}")
        session = chat_sessions_collection.find_one({"_id": ObjectId(chat_id)})
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        session["_id"] = str(session["_id"])
        if "created_at" in session and isinstance(session["created_at"], datetime):
            session["created_at"] = session["created_at"].isoformat()
        if "updated_at" in session and isinstance(session["updated_at"], datetime):
            session["updated_at"] = session["updated_at"].isoformat()
        
        return session
    except Exception as e:
        print(f"Error fetching chat session: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/chat/{chat_id}")
async def update_chat_session(chat_id: str, session_update: dict):
    """Update chat session title"""
    try:
        print(f"Updating chat session: {chat_id}")
        result = chat_sessions_collection.update_one(
            {"_id": ObjectId(chat_id)},
            {
                "$set": {
                    "title": session_update["title"],
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        session = chat_sessions_collection.find_one({"_id": ObjectId(chat_id)})
        session["_id"] = str(session["_id"])
        if "created_at" in session and isinstance(session["created_at"], datetime):
            session["created_at"] = session["created_at"].isoformat()
        if "updated_at" in session and isinstance(session["updated_at"], datetime):
            session["updated_at"] = session["updated_at"].isoformat()
        
        return session
    except Exception as e:
        print(f"Error updating chat session: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/chat/{chat_id}")
async def delete_chat_session(chat_id: str):
    """Delete a chat session and its messages"""
    try:
        print(f"Deleting chat session: {chat_id}")
        # Delete chat session
        result = chat_sessions_collection.delete_one({"_id": ObjectId(chat_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        # Delete all messages in this chat
        delete_result = chat_messages_collection.delete_many({"chat_id": chat_id})
        print(f"Deleted {delete_result.deleted_count} messages")
        
        return {"message": "Chat session deleted successfully"}
    except Exception as e:
        print(f"Error deleting chat session: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/chat/{chat_id}/messages")
async def get_chat_messages(chat_id: str):
    """Get all messages for a chat session"""
    try:
        print(f"Fetching messages for chat: {chat_id}")
        messages = list(chat_messages_collection.find(
            {"chat_id": chat_id}
        ).sort("timestamp", 1))
        
        # Convert ObjectId to string and format datetime
        for msg in messages:
            msg["_id"] = str(msg["_id"])
            if "timestamp" in msg and isinstance(msg["timestamp"], datetime):
                msg["timestamp"] = msg["timestamp"].isoformat()
        
        print(f"Found {len(messages)} messages")
        return messages
    except Exception as e:
        print(f"Error fetching messages: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/chat/message")
async def create_chat_message(message_data: dict):
    """Save a chat message"""
    try:
        print(f"Saving message for chat: {message_data.get('chat_id')}")
        
        # Verify chat session exists
        session = chat_sessions_collection.find_one({"_id": ObjectId(message_data["chat_id"])})
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        message = {
            "chat_id": message_data["chat_id"],
            "type": message_data["type"],
            "content": message_data["content"],
            "timestamp": datetime.utcnow()
        }
        
        result = chat_messages_collection.insert_one(message)
        
        # Update chat session's updated_at
        chat_sessions_collection.update_one(
            {"_id": ObjectId(message_data["chat_id"])},
            {"$set": {"updated_at": datetime.utcnow()}}
        )
        
        message["_id"] = str(result.inserted_id)
        message["timestamp"] = message["timestamp"].isoformat()
        
        print(f"Message saved with ID: {message['_id']}")
        return message
    except Exception as e:
        print(f"Error saving message: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ---------------------------
# ASK ENDPOINT (FIXED WITH PROPER BULLET POINT FORMATTING)
# ---------------------------

@app.get("/ask")
def ask(question: str, chat_id: Optional[str] = None):
    try:
        print(f"Processing question: {question[:50]}... for chat: {chat_id}")
        
        # 1️⃣ Embed question
        question_embedding = embed_model.encode(question)

        # 2️⃣ Fetch docs
        docs = list(documents_collection.find({}))

        if not docs:
            answer = "No documents found in database."
            if chat_id:
                bot_message = {
                    "chat_id": chat_id,
                    "type": "bot",
                    "content": answer,
                    "timestamp": datetime.utcnow()
                }
                chat_messages_collection.insert_one(bot_message)
                chat_sessions_collection.update_one(
                    {"_id": ObjectId(chat_id)},
                    {"$set": {"updated_at": datetime.utcnow()}}
                )
            return {"answer": answer}

        # 3️⃣ Score similarity with SEMANTIC MATCHING
        scored_chunks = []
        question_lower = question.lower()
        
        # Extract core keywords from question
        core_keywords = []
        if "steel detailing" in question_lower:
            core_keywords = ["steel detailing", "introduction to steel detailing"]
        elif "bolt" in question_lower or "connection" in question_lower:
            core_keywords = ["bolt", "connection", "details"]
        elif "types" in question_lower or "drawings" in question_lower:
            core_keywords = ["types", "drawings"]
        elif "reading" in question_lower or "structural" in question_lower:
            core_keywords = ["reading", "structural", "drawings"]
        elif "fabrication" in question_lower:
            core_keywords = ["fabrication", "process"]
        elif "erection" in question_lower:
            core_keywords = ["erection", "process"]
        elif "members" in question_lower:
            core_keywords = ["members", "structural"]
        elif "quality" in question_lower:
            core_keywords = ["quality", "checks"]

        for doc in docs:
            chunk_embedding = np.array(doc["embedding"])
            base_score = cosine_similarity(question_embedding, chunk_embedding)
            
            # TITLE MATCHING BONUS
            text_lower = doc["text"].lower()
            title_bonus = 0.0
            
            # Check if chunk contains exact title match or introduction
            if any(keyword in text_lower for keyword in core_keywords):
                title_bonus = 0.3
            
            # Extra bonus for chunks that start with numbered sections
            if re.match(r'^\d+\.', doc["text"].strip()):
                title_bonus += 0.1
            
            final_score = base_score + title_bonus
            scored_chunks.append((final_score, doc["text"], base_score, title_bonus))

        # 4️⃣ Sort all chunks by final score
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        
        # 5️⃣ DEBUG: Print scores
        print("\n" + "="*70)
        print(f"🔍 QUESTION: '{question}'")
        print("="*70)
        
        for i, (final_score, text, base_score, bonus) in enumerate(scored_chunks[:5]):
            preview = text[:150].replace('\n', ' ') + "..."
            print(f"\n{i+1}. FINAL SCORE: {final_score:.4f} (base: {base_score:.4f} + bonus: {bonus:.2f})")
            print(f"   PREVIEW: {preview}")
        print("="*70)

        # 6️⃣ Select the best chunk
        best_final_score, best_text, best_base_score, best_bonus = scored_chunks[0]
        
        # If top chunk has low score but second chunk has good keywords, check second
        if best_final_score < 0.5 and len(scored_chunks) > 1:
            second_score, second_text, second_base, second_bonus = scored_chunks[1]
            if second_bonus > best_bonus:
                best_text = second_text
                print(f"   📌 Using second chunk instead (better keyword match)")

        # Clean the text
        best_text = re.sub(r"\s+", " ", best_text).strip()

        # 7️⃣ Format as bullet points with sub-heading (pass the question)
        answer = format_as_bullet_points(best_text, question)

        # 8️⃣ Clean up
        answer = answer.strip()
        if answer.lower().startswith("answer:"):
            answer = answer[7:].strip()

        # 9️⃣ Save response
        if chat_id:
            bot_message = {
                "chat_id": chat_id,
                "type": "bot",
                "content": answer,
                "timestamp": datetime.utcnow()
            }
            chat_messages_collection.insert_one(bot_message)
            chat_sessions_collection.update_one(
                {"_id": ObjectId(chat_id)},
                {"$set": {"updated_at": datetime.utcnow()}}
            )
            print(f"✅ Answer length: {len(answer)} chars")
            print(f"✅ Answer preview: {answer[:200]}...")

        return {"answer": answer}
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------
# INCLUDE ADMIN ROUTER
# ---------------------------

app.include_router(admin.router)

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
            "/api/users/me": "GET - Get current user",
            "/chat/sessions": "GET - Get user chat sessions",
            "/chat/create": "POST - Create new chat session",
            "/chat/{chat_id}": "GET - Get chat session",
            "/chat/{chat_id}": "PUT - Update chat session",
            "/chat/{chat_id}": "DELETE - Delete chat session",
            "/chat/{chat_id}/messages": "GET - Get chat messages",
            "/chat/message": "POST - Save chat message",
            "/admin/dashboard": "GET - Admin dashboard (admin only)",
            "/admin/users": "GET - List all users (admin only)",
            "/admin/users/{user_id}/activity": "GET - User activity (admin only)",
            "/admin/searches/recent": "GET - Recent searches (admin only)",
            "/admin/statistics": "GET - Detailed statistics (admin only)"
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
    
    # Check collections
    users_count = users_collection.count_documents({})
    chat_sessions_count = chat_sessions_collection.count_documents({})
    chat_messages_count = chat_messages_collection.count_documents({})
    documents_count = documents_collection.count_documents({})
    
    # Check admin user exists
    admin_exists = users_collection.count_documents({"username": "admin"}) > 0
    
    return {
        "status": "healthy",
        "database": db_status,
        "users": users_count,
        "chat_sessions": chat_sessions_count,
        "chat_messages": chat_messages_count,
        "documents": documents_count,
        "admin_exists": admin_exists,
        "models": "loaded",
        "timestamp": datetime.utcnow().isoformat()
    }