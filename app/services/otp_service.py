"""
app/services/otp_service.py
─────────────────────────────
Handles generation, sending, and database validation of OTPs.
"""

import random
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.otp import OTPRecord
from app.core.security import hash_password, verify_password


def generate_otp() -> str:
    """Generate a random 6-digit OTP."""
    return str(random.randint(100000, 999999))


def send_otp_email(receiver_email: str, otp: str):
    """Securely dispatch the OTP code via configured SMTP protocol."""
    if not settings.SMTP_EMAIL or not settings.SMTP_PASSWORD:
        print("WARNING: SMTP credentials missing. OTP email bypassed (Dev Mode).")
        print(f"OTP for {receiver_email} is {otp}")
        return True

    msg = EmailMessage()
    msg.set_content(f"Your Verification Code is: {otp}\n\nThis code is valid for 2 minutes and is specifically generated for your university portal request.")
    msg['Subject'] = "Intel AI Project - OTP Verification"
    msg['From'] = settings.SMTP_EMAIL
    msg['To'] = receiver_email

    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
        return True
    except Exception as e:
        print(f"SMTP Dispatch Error: {e}")
        return False


async def request_otp_db(db: AsyncSession, email: str, purpose: str) -> None:
    """Invalidates existing unverified OTPs and generates/transmits a new one."""
    if purpose not in {"login", "register"}:
        raise HTTPException(status_code=400, detail="Invalid OTP purpose.")

    # Invalidate older unverified records for this exact combination
    await db.execute(
        delete(OTPRecord).where(
            OTPRecord.email == email, 
            OTPRecord.purpose == purpose,
            OTPRecord.verified == False
        )
    )

    otp_value = generate_otp()
    expires = datetime.now(timezone.utc) + timedelta(minutes=2)

    new_record = OTPRecord(
        email=email,
        purpose=purpose,
        otp_hash=hash_password(otp_value),
        expires_at=expires,
        attempts=0,
        verified=False
    )
    db.add(new_record)
    
    # Try sending via email
    if not send_otp_email(email, otp_value):
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to dispatch verification email. System failure."
        )

    await db.commit()


async def verify_otp_db(db: AsyncSession, email: str, otp: str, purpose: str) -> bool:
    """Validates the OTP attempts against the database securely."""
    result = await db.execute(
        select(OTPRecord)
        .where(OTPRecord.email == email)
        .where(OTPRecord.purpose == purpose)
        .order_by(OTPRecord.expires_at.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="No active OTP found. Please send a new code.")
    
    if record.verified:
        raise HTTPException(status_code=400, detail="This code has already been verified securely.")

    if datetime.now(timezone.utc) > record.expires_at.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new code.")

    if record.attempts >= 3:
        raise HTTPException(status_code=403, detail="Maximum attempts reached. Please request a new code.")

    if not verify_password(otp, record.otp_hash):
        record.attempts += 1
        await db.commit()
        raise HTTPException(
            status_code=400, 
            detail=f"Incorrect OTP code. ({record.attempts}/3 attempts)"
        )

    # Success! Set as verified.
    record.verified = True
    await db.commit()
    return True
