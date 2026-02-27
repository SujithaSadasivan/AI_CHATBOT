from pymongo import MongoClient
import bcrypt
from datetime import datetime

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017")
db = client["steel_rag"]
users_collection = db["users"]

print("="*60)
print("🔄 COMPLETE ADMIN RESET")
print("="*60)

# First, delete any existing admin user
print("\n🗑️ Removing existing admin users...")
result = users_collection.delete_many({"username": "admin"})
print(f"  Deleted {result.deleted_count} admin users")

# Create brand new admin user
print("\n👤 Creating new admin user...")

username = "admin"
password = "admin123"
email = "admin@steelrag.com"
full_name = "Administrator"

# Generate hash with explicit parameters
print(f"  Password: '{password}'")
salt = bcrypt.gensalt(rounds=12)
print(f"  Salt: {salt.decode('utf-8')}")

hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
hashed_password = hashed.decode('utf-8')
print(f"  Hash: {hashed_password}")

# Create user document
new_user = {
    "username": username,
    "email": email,
    "full_name": full_name,
    "hashed_password": hashed_password,
    "disabled": False,
    "is_admin": True,
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow()
}

# Insert into database
insert_result = users_collection.insert_one(new_user)
print(f"  ✅ User created with ID: {insert_result.inserted_id}")

# Verify
print("\n🔍 Verifying...")
admin = users_collection.find_one({"username": "admin"})
if admin:
    print(f"  Username: {admin.get('username')}")
    print(f"  Email: {admin.get('email')}")
    print(f"  Is Admin: {admin.get('is_admin')}")
    print(f"  Hash: {admin.get('hashed_password')}")
    
    # Test password
    test_result = bcrypt.checkpw(
        password.encode('utf-8'),
        admin.get('hashed_password').encode('utf-8')
    )
    print(f"  Password test: {test_result}")
    
    if test_result:
        print("\n✅ ADMIN USER READY!")
        print("="*60)
        print("Login credentials:")
        print(f"  Username: {username}")
        print(f"  Password: {password}")
        print("="*60)
    else:
        print("\n❌ Password verification failed")
else:
    print("\n❌ Failed to create admin user")