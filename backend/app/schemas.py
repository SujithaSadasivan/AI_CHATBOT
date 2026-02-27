# app/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from pydantic import ConfigDict

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

# User schemas
class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Chat session schemas
class ChatSessionCreate(BaseModel):
    user_id: str
    title: str = "New Chat"

class ChatSessionUpdate(BaseModel):
    title: str

class ChatSessionResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    user_id: str
    title: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Chat message schemas
class ChatMessageCreate(BaseModel):
    chat_id: str
    type: str  # "user" or "bot"
    content: str

class ChatMessageResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    chat_id: str
    type: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Ask endpoint schema
class AskRequest(BaseModel):
    question: str
    chat_id: Optional[str] = None

class AskResponse(BaseModel):
    answer: str
    sources: Optional[List[dict]] = None