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

# ---------------------------
# ADMIN FEEDBACK ENDPOINTS
# ---------------------------

@router.get("/feedback")
async def get_all_feedback(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    rating: Optional[int] = Query(None, ge=1, le=5),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    current_admin: UserInDB = Depends(get_current_admin_user)
):
    """Get all feedback with filters and pagination (admin only)"""
    print(f"🔍 Feedback list accessed by: {current_admin.username}")
    
    # Get database collections
    from pymongo import MongoClient
    client = MongoClient("mongodb://localhost:27017")
    db = client["steel_rag"]
    feedback_collection = db["feedback"]
    
    # Build query
    query = {}
    
    if rating:
        query["rating"] = rating
    
    if category:
        query["category"] = category
    
    if start_date or end_date:
        date_query = {}
        if start_date:
            try:
                date_query["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except:
                date_query["$gte"] = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            try:
                date_query["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except:
                # Add one day to include the entire end date
                end = datetime.strptime(end_date, "%Y-%m-%d")
                end = end.replace(hour=23, minute=59, second=59)
                date_query["$lte"] = end
        if date_query:
            query["created_at"] = date_query
    
    # Get total count
    total = feedback_collection.count_documents(query)
    
    # Get feedback with pagination
    feedback_items = list(feedback_collection.find(query)
                         .sort("created_at", -1)
                         .skip(skip)
                         .limit(limit))
    
    # Format feedback items
    formatted_feedback = []
    for item in feedback_items:
        formatted_feedback.append({
            "id": str(item["_id"]),
            "user_id": item.get("user_id", ""),
            "username": item.get("username", "Unknown"),
            "chat_id": item.get("chat_id", ""),
            "chat_title": item.get("chat_title", "Untitled Chat"),
            "message_id": item.get("message_id", ""),
            "user_message": item.get("user_message", ""),
            "bot_response": item.get("bot_response", ""),
            "rating": item.get("rating", 0),
            "feedback_text": item.get("feedback_text", ""),
            "category": item.get("category", "other"),
            "created_at": item.get("created_at", datetime.utcnow()).isoformat() if item.get("created_at") else None
        })
    
    # Get rating distribution
    rating_distribution = []
    for r in range(1, 6):
        count = feedback_collection.count_documents({"rating": r})
        rating_distribution.append({
            "rating": r,
            "count": count
        })
    
    # Get category distribution
    categories = ["accurate", "inaccurate", "helpful", "unhelpful", "other"]
    category_distribution = []
    for cat in categories:
        count = feedback_collection.count_documents({"category": cat})
        category_distribution.append({
            "category": cat,
            "count": count
        })
    
    return {
        "total": total,
        "feedback": formatted_feedback,
        "skip": skip,
        "limit": limit,
        "rating_distribution": rating_distribution,
        "category_distribution": category_distribution
    }

print(f"✅ Feedback list endpoint registered")

@router.get("/feedback/stats")
async def get_feedback_stats(
    current_admin: UserInDB = Depends(get_current_admin_user)
):
    """Get feedback statistics (admin only)"""
    print(f"🔍 Feedback stats accessed by: {current_admin.username}")
    
    # Get database collections
    from pymongo import MongoClient
    client = MongoClient("mongodb://localhost:27017")
    db = client["steel_rag"]
    feedback_collection = db["feedback"]
    
    # Total feedback count
    total_feedback = feedback_collection.count_documents({})
    
    # Average rating
    pipeline = [
        {"$group": {
            "_id": None,
            "average_rating": {"$avg": "$rating"},
            "total_count": {"$sum": 1}
        }}
    ]
    result = list(feedback_collection.aggregate(pipeline))
    avg_rating = result[0]["average_rating"] if result else 0
    
    # Rating distribution
    rating_dist = []
    for i in range(1, 6):
        count = feedback_collection.count_documents({"rating": i})
        rating_dist.append({"rating": i, "count": count})
    
    # Category distribution
    category_dist = []
    categories = feedback_collection.distinct("category")
    for cat in categories:
        if cat:  # Skip null categories
            count = feedback_collection.count_documents({"category": cat})
            category_dist.append({"category": cat, "count": count})
    
    # Feedback over time (last 7 days)
    time_dist = []
    for i in range(6, -1, -1):
        date = (datetime.utcnow() - timedelta(days=i)).date()
        start = datetime.combine(date, datetime.min.time())
        end = datetime.combine(date, datetime.max.time())
        
        count = feedback_collection.count_documents({
            "created_at": {"$gte": start, "$lte": end}
        })
        
        time_dist.append({
            "date": date.isoformat(),
            "count": count
        })
    
    return {
        "total_feedback": total_feedback,
        "average_rating": round(avg_rating, 2) if avg_rating else 0,
        "rating_distribution": rating_dist,
        "category_distribution": category_dist,
        "feedback_over_time": time_dist,
        "timestamp": datetime.utcnow().isoformat()
    }

print(f"✅ Feedback stats endpoint registered")

@router.get("/feedback/{feedback_id}")
async def get_feedback_detail(
    feedback_id: str,
    current_admin: UserInDB = Depends(get_current_admin_user)
):
    """Get detailed feedback by ID (admin only)"""
    print(f"🔍 Feedback detail accessed by: {current_admin.username} for ID: {feedback_id}")
    
    # Get database collections
    from pymongo import MongoClient
    client = MongoClient("mongodb://localhost:27017")
    db = client["steel_rag"]
    feedback_collection = db["feedback"]
    
    # Get feedback
    try:
        feedback = feedback_collection.find_one({"_id": ObjectId(feedback_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid feedback ID format")
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    # Format feedback
    formatted_feedback = {
        "id": str(feedback["_id"]),
        "user_id": feedback.get("user_id", ""),
        "username": feedback.get("username", "Unknown"),
        "chat_id": feedback.get("chat_id", ""),
        "chat_title": feedback.get("chat_title", "Untitled Chat"),
        "message_id": feedback.get("message_id", ""),
        "user_message": feedback.get("user_message", ""),
        "bot_response": feedback.get("bot_response", ""),
        "rating": feedback.get("rating", 0),
        "feedback_text": feedback.get("feedback_text", ""),
        "category": feedback.get("category", "other"),
        "created_at": feedback.get("created_at", datetime.utcnow()).isoformat() if feedback.get("created_at") else None
    }
    
    # Get the full conversation context
    if ObjectId.is_valid(feedback.get("chat_id", "")):
        chat_messages = get_chat_messages_collection()
        
        # Get all messages in this chat (limited to 10 for context)
        messages = list(chat_messages.find({
            "chat_id": feedback["chat_id"]
        }).sort("timestamp", 1).limit(10))
        
        conversation = []
        for msg in messages:
            conversation.append({
                "id": str(msg["_id"]),
                "type": msg.get("type", ""),
                "content": msg.get("content", ""),
                "timestamp": msg.get("timestamp", datetime.utcnow()).isoformat() if msg.get("timestamp") else None
            })
        
        formatted_feedback["conversation"] = conversation
    
    return formatted_feedback

print(f"✅ Feedback detail endpoint registered")

print("="*50)
print("✅ ALL ADMIN ENDPOINTS REGISTERED SUCCESSFULLY")
print("="*50)