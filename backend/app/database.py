from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")

# Force connection check
try:
    client.admin.command("ping")
    print("✅ MongoDB Connected Successfully")
except Exception as e:
    print("❌ MongoDB Connection Failed:", e)

db = client["steel_rag"]
collection = db["documents"]