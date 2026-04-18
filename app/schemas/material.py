"""
app/schemas/material.py
────────────────────────
Pydantic schemas for the materials library endpoints.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.material import Category


class MaterialCreate(BaseModel):
    """Form fields sent alongside the uploaded file."""

    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    subject: str = Field(..., min_length=2, max_length=100)
    course: Optional[str] = Field(None, max_length=100)
    semester: Optional[int] = Field(None, ge=1, le=10)
    category: Category


class MaterialOut(BaseModel):
    """Full material response returned to clients."""

    id: str
    title: str
    description: Optional[str]
    subject: str
    course: Optional[str]
    semester: Optional[int]
    category: Category
    file_name: str
    file_size: int
    file_type: str
    is_approved: bool
    view_count: int
    uploader_id: str
    file_url: Optional[str] = None
    file_status: str = "available"  # ["available", "missing"]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MaterialSearchQuery(BaseModel):
    """Query parameters for material search."""

    q: Optional[str] = Field(None, description="Search term for title/description")
    course: Optional[str] = None
    subject: Optional[str] = None
    category: Optional[Category] = None
    semester: Optional[int] = Field(None, ge=1, le=10)
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class PaginatedMaterials(BaseModel):
    """Paginated material list response."""

    total: int
    page: int
    page_size: int
    items: List[MaterialOut]
