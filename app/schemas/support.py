"""
app/schemas/support.py
───────────────────────
Validation schemas for contact requests.
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class ContactCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=10, max_length=2000)

class ContactOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    subject: str
    message: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
