from pymongo import MongoClient
client = MongoClient("mongodb://localhost:27017")
db = client["steel_rag"]
db.documents.delete_many({})
print("Old data removed")