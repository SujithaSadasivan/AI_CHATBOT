from pymongo import MongoClient
from pymongo.collection import Collection
from typing import Optional
from dotenv import load_dotenv
import os

load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "steel_rag")  # Changed to steel_rag

class MongoDB:
    client: Optional[MongoClient] = None
    db = None

    def connect(self):
        try:
            self.client = MongoClient(MONGO_URI)
            self.db = self.client[DB_NAME]
            
            # Force connection check
            self.client.admin.command("ping")
            print(f"✅ MongoDB Connected Successfully to {DB_NAME}")
            
            # Create indexes
            self.create_indexes()
            
        except Exception as e:
            print(f"❌ MongoDB Connection Failed: {e}")
            raise e
    
    def close(self):
        if self.client:
            self.client.close()
            print("MongoDB connection closed")
    
    def create_indexes(self):
        try:
            # Users collection indexes
            if "users" in self.db.list_collection_names():
                self.db.users.create_index("email", unique=True)
            
            # Chat sessions collection indexes
            self.db.chat_sessions.create_index([("user_id", 1), ("created_at", -1)])
            
            # Chat messages collection indexes
            self.db.chat_messages.create_index([("chat_id", 1), ("timestamp", 1)])
            
            print("✅ Database indexes created/verified")
        except Exception as e:
            print(f"⚠️ Index creation warning: {e}")

mongodb = MongoDB()

def get_db():
    if mongodb.db is None:
        mongodb.connect()
    return mongodb.db

def get_collection(collection_name: str):
    db = get_db()
    return db[collection_name]

# Specific collections for easy access
def get_documents_collection():
    return get_collection("documents")

def get_users_collection():
    return get_collection("users")

def get_chat_sessions_collection():
    return get_collection("chat_sessions")

def get_chat_messages_collection():
    return get_collection("chat_messages")