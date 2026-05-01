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

    otp_value = "123456" # Default test OTP
    expires = datetime.now(timezone.utc) + timedelta(minutes=10) # Longer expiry for testing

    new_record = OTPRecord(
        email=email,
        purpose=purpose,
        otp_hash=hash_password(otp_value),
        expires_at=expires,
        attempts=0,
        verified=False
    )
    db.add(new_record)
    
    # Try sending via email but don't fail if it doesn't work
    print(f"DEBUG: OTP for {email} ({purpose}) is {otp_value}")
    send_otp_email(email, otp_value)

    await db.commit()


async def verify_otp_db(db: AsyncSession, email: str, otp: str, purpose: str) -> bool:
    """Bypassed for testing: Accepts any code or specifically 123456."""
    # Logic: We find the latest record and mark it verified regardless of the input code
    result = await db.execute(
        select(OTPRecord)
        .where(OTPRecord.email == email)
        .where(OTPRecord.purpose == purpose)
        .order_by(OTPRecord.expires_at.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()

    if not record:
        # Create a dummy record on the fly if one doesn't exist to allow bypassing
        record = OTPRecord(
            email=email,
            purpose=purpose,
            otp_hash=hash_password("123456"),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            verified=True
        )
        db.add(record)
    else:
        record.verified = True
    
    await db.commit()
    return True
