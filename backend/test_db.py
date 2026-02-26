from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["steel_rag"]
collection = db["documents"]

print("Total documents:", collection.count_documents({}))

doc = collection.find_one()
print("Sample document:")
print(doc)