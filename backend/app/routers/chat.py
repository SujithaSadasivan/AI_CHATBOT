from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from datetime import datetime
from bson import ObjectId
from app.database import get_chat_sessions_collection, get_chat_messages_collection

router = APIRouter(prefix="/chat", tags=["chat"])

@router.get("/sessions")
async def get_chat_sessions(
    user_id: str = Query(...)
):
    """Get all chat sessions for a user"""
    chat_sessions = get_chat_sessions_collection()
    
    sessions = list(chat_sessions.find(
        {"user_id": user_id}
    ).sort("created_at", -1))
    
    # Convert ObjectId to string for JSON serialization
    for session in sessions:
        session["_id"] = str(session["_id"])
    
    return sessions

@router.post("/create")
async def create_chat_session(
    session_data: dict
):
    """Create a new chat session"""
    chat_sessions = get_chat_sessions_collection()
    
    session = {
        "user_id": session_data["user_id"],
        "title": session_data.get("title", "New Chat"),
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    result = chat_sessions.insert_one(session)
    session["_id"] = str(result.inserted_id)
    
    return session

@router.get("/{chat_id}")
async def get_chat_session(
    chat_id: str
):
    """Get a specific chat session"""
    chat_sessions = get_chat_sessions_collection()
    
    try:
        session = chat_sessions.find_one({"_id": ObjectId(chat_id)})
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        session["_id"] = str(session["_id"])
        return session
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid chat ID format: {str(e)}")

@router.put("/{chat_id}")
async def update_chat_session(
    chat_id: str,
    session_update: dict
):
    """Update chat session title"""
    chat_sessions = get_chat_sessions_collection()
    
    try:
        result = chat_sessions.update_one(
            {"_id": ObjectId(chat_id)},
            {
                "$set": {
                    "title": session_update["title"],
                    "updated_at": datetime.now()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        session = chat_sessions.find_one({"_id": ObjectId(chat_id)})
        session["_id"] = str(session["_id"])
        return session
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating chat: {str(e)}")

@router.delete("/{chat_id}")
async def delete_chat_session(
    chat_id: str
):
    """Delete a chat session and its messages"""
    chat_sessions = get_chat_sessions_collection()
    chat_messages = get_chat_messages_collection()
    
    try:
        # Delete chat session
        result = chat_sessions.delete_one({"_id": ObjectId(chat_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        # Delete all messages in this chat
        chat_messages.delete_many({"chat_id": chat_id})
        
        return {"message": "Chat session deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error deleting chat: {str(e)}")

@router.get("/{chat_id}/messages")
async def get_chat_messages(
    chat_id: str
):
    """Get all messages for a chat session"""
    chat_messages = get_chat_messages_collection()
    
    try:
        messages = list(chat_messages.find(
            {"chat_id": chat_id}
        ).sort("timestamp", 1))
        
        # Convert ObjectId to string
        for msg in messages:
            msg["_id"] = str(msg["_id"])
        
        return messages
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching messages: {str(e)}")

@router.post("/message")
async def create_chat_message(
    message_data: dict
):
    """Save a chat message"""
    chat_sessions = get_chat_sessions_collection()
    chat_messages = get_chat_messages_collection()
    
    try:
        # Verify chat session exists
        session = chat_sessions.find_one({"_id": ObjectId(message_data["chat_id"])})
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        message = {
            "chat_id": message_data["chat_id"],
            "type": message_data["type"],
            "content": message_data["content"],
            "timestamp": datetime.now()
        }
        
        result = chat_messages.insert_one(message)
        
        # Update chat session's updated_at
        chat_sessions.update_one(
            {"_id": ObjectId(message_data["chat_id"])},
            {"$set": {"updated_at": datetime.now()}}
        )
        
        message["_id"] = str(result.inserted_id)
        return message
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error saving message: {str(e)}")