from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
import bcrypt
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr, Field
from pymongo import MongoClient
import os

# Secret key for JWT
SECRET_KEY = "your-secret-key-change-this-in-production-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# MongoDB connection
client = MongoClient("mongodb://localhost:27017")
db = client["steel_rag"]
users_collection = db["users"]

# Pydantic models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    id: Optional[str] = None
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    disabled: Optional[bool] = False
    is_admin: Optional[bool] = False

    class Config:
        from_attributes = True

class UserInDB(User):
    hashed_password: str

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

# Password hashing functions (using bcrypt directly)
def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        print(f"🔐 Verifying password...")
        print(f"  Plain password length: {len(plain_password)}")
        print(f"  Hashed password: {hashed_password[:30]}...")
        
        # Ensure both are bytes
        if isinstance(plain_password, str):
            plain_password = plain_password.encode('utf-8')
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
        
        # Check if the hash is in valid bcrypt format
        if not hashed_password.startswith(b'$2b$') and not hashed_password.startswith(b'$2a$'):
            print(f"  ❌ Invalid hash format: {hashed_password[:10]}")
            return False
        
        result = bcrypt.checkpw(plain_password, hashed_password)
        print(f"  ✅ Result: {result}")
        return result
    except Exception as e:
        print(f"❌ Password verification error: {e}")
        import traceback
        traceback.print_exc()
        return False

def get_user(username: str) -> Optional[UserInDB]:
    """Get user by username"""
    print(f"🔍 Looking up user: '{username}'")
    user_dict = users_collection.find_one({"username": username})
    if user_dict:
        print(f"  ✅ User found in database")
        # Convert ObjectId to string for id field
        user_dict['id'] = str(user_dict.pop('_id'))
        print(f"  Username: {user_dict.get('username')}")
        print(f"  Email: {user_dict.get('email')}")
        print(f"  Is Admin: {user_dict.get('is_admin', False)}")
        print(f"  Hashed password exists: {bool(user_dict.get('hashed_password'))}")
        return UserInDB(**user_dict)
    print(f"  ❌ User not found")
    return None

def get_user_by_email(email: str) -> Optional[UserInDB]:
    """Get user by email"""
    user_dict = users_collection.find_one({"email": email})
    if user_dict:
        user_dict['id'] = str(user_dict.pop('_id'))
        return UserInDB(**user_dict)
    return None

def get_user_by_id(user_id: str) -> Optional[UserInDB]:
    """Get user by ID"""
    from bson import ObjectId
    try:
        user_dict = users_collection.find_one({"_id": ObjectId(user_id)})
        if user_dict:
            user_dict['id'] = str(user_dict.pop('_id'))
            return UserInDB(**user_dict)
    except:
        pass
    return None

def authenticate_user(username: str, password: str) -> Union[UserInDB, bool]:
    """Authenticate user by username and password"""
    print(f"\n🔑 AUTHENTICATING USER: '{username}'")
    
    user = get_user(username)
    if not user:
        print(f"  ❌ User not found")
        return False
    
    print(f"  ✅ User found, verifying password...")
    
    if not verify_password(password, user.hashed_password):
        print(f"  ❌ Password verification failed")
        return False
    
    print(f"  ✅ Authentication successful!")
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """Get current active user"""
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_admin_user(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
    """Get current admin user"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not enough permissions. Admin access required."
        )
    return current_user

def user_to_response(user: UserInDB) -> dict:
    """Convert UserInDB to response dict with id"""
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "disabled": user.disabled,
        "is_admin": user.is_admin
    }