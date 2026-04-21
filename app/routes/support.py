"""
app/routes/support.py
──────────────────────
Router for handling contact form submissions.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.support import ContactSubmission
from app.schemas.support import ContactCreate, ContactOut

router = APIRouter(prefix="/support", tags=["Support"])

@router.post("/contact", status_code=status.HTTP_201_CREATED, response_model=ContactOut)
async def submit_contact_form(payload: ContactCreate, db: AsyncSession = Depends(get_db)):
    """
    Submit a contact form inquiry.
    Stored in the database for admin review.
    """
    new_submission = ContactSubmission(
        name=payload.name,
        email=payload.email,
        subject=payload.subject,
        message=payload.message
    )
    
    db.add(new_submission)
    await db.commit()
    await db.refresh(new_submission)
    
    return new_submission
