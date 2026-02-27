from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
from app.database import get_users_collection, get_chat_sessions_collection, get_chat_messages_collection
from app.auth import get_current_admin_user, UserInDB

print("="*50)
print("✅ ADMIN ROUTER MODULE IS BEING LOADED")
print("="*50)

router = APIRouter(prefix="/admin", tags=["admin"])

print(f"✅ Router created with prefix: /admin")
print(f"✅ Router object: {router}")

@router.get("/dashboard")
async def get_admin_dashboard(
    current_admin: UserInDB = Depends(get_current_admin_user)
):
    """Get admin dashboard statistics"""
    print(f"🔍 Admin dashboard accessed by: {current_admin.username}")
    
    users_collection = get_users_collection()
    chat_sessions = get_chat_sessions_collection()
    chat_messages = get_chat_messages_collection()
    
    # Get total counts
    total_users = users_collection.count_documents({})
    total_chats = chat_sessions.count_documents({})
    total_messages = chat_messages.count_documents({})
    
    # Get today's activity
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    today_users = users_collection.count_documents({
        "created_at": {"$gte": today_start}
    })
    
    today_chats = chat_sessions.count_documents({
        "created_at": {"$gte": today_start}
    })
    
    today_messages = chat_messages.count_documents({
        "timestamp": {"$gte": today_start}
    })
    
    return {
        "total_users": total_users,
        "total_chats": total_chats,
        "total_messages": total_messages,
        "today_users": today_users,
        "today_chats": today_chats,
        "today_messages": today_messages,
        "timestamp": datetime.utcnow().isoformat()
    }

print(f"✅ Dashboard endpoint registered")

@router.get("/users")
async def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    current_admin: UserInDB = Depends(get_current_admin_user)
):
    """Get all users with pagination"""
    print(f"🔍 Users list accessed by: {current_admin.username}")
    
    users_collection = get_users_collection()
    
    # Build query
    query = {}
    if search:
        query = {
            "$or": [
                {"username": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"full_name": {"$regex": search, "$options": "i"}}
            ]
        }
    
    # Get total count
    total = users_collection.count_documents(query)
    
    # Get users
    users = list(users_collection.find(query)
                 .sort("created_at", -1)
                 .skip(skip)
                 .limit(limit))
    
    # Format users
    formatted_users = []
    for user in users:
        # Get user's chat stats
        chat_count = get_chat_sessions_collection().count_documents({"user_id": str(user["_id"])})
        
        # Get all chat sessions for this user
        user_chats = list(get_chat_sessions_collection().find({"user_id": str(user["_id"])}))
        chat_ids = [str(chat["_id"]) for chat in user_chats]
        
        message_count = 0
        if chat_ids:
            message_count = get_chat_messages_collection().count_documents({
                "chat_id": {"$in": chat_ids}
            })
        
        formatted_users.append({
            "id": str(user["_id"]),
            "username": user.get("username", ""),
            "email": user.get("email", ""),
            "full_name": user.get("full_name", ""),
            "is_admin": user.get("is_admin", False),
            "disabled": user.get("disabled", False),
            "created_at": user.get("created_at", datetime.utcnow()).isoformat() if user.get("created_at") else None,
            "chat_count": chat_count,
            "message_count": message_count
        })
    
    return {
        "total": total,
        "users": formatted_users,
        "skip": skip,
        "limit": limit
    }

print(f"✅ Users endpoint registered")

@router.get("/searches/recent")
async def get_recent_searches(
    limit: int = Query(50, ge=1, le=200),
    current_admin: UserInDB = Depends(get_current_admin_user)
):
    """Get recent searches across all users"""
    print(f"🔍 Recent searches accessed by: {current_admin.username}")
    
    chat_messages = get_chat_messages_collection()
    users_collection = get_users_collection()
    
    # Get recent user messages
    recent_messages = list(chat_messages.find({
        "type": "user"
    }).sort("timestamp", -1).limit(limit))
    
    searches = []
    for msg in recent_messages:
        # Get chat session info
        session = None
        if ObjectId.is_valid(msg["chat_id"]):
            session = get_chat_sessions_collection().find_one({"_id": ObjectId(msg["chat_id"])})
        
        if session:
            # Get user info
            user = None
            if ObjectId.is_valid(session["user_id"]):
                user = users_collection.find_one({"_id": ObjectId(session["user_id"])})
            
            searches.append({
                "id": str(msg["_id"]),
                "user": {
                    "id": str(user["_id"]) if user else None,
                    "username": user.get("username", "Unknown") if user else "Unknown",
                    "full_name": user.get("full_name", "") if user else ""
                } if user else None,
                "query": msg.get("content", ""),
                "timestamp": msg.get("timestamp", datetime.utcnow()).isoformat() if msg.get("timestamp") else None,
                "chat_title": session.get("title", "New Chat")
            })
    
    return searches

print(f"✅ Searches endpoint registered")
print("="*50)
print("✅ ALL ADMIN ENDPOINTS REGISTERED SUCCESSFULLY")
print("="*50)