from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog
from app.models.user import User

async def log_action(user: User, action: str, description: str, db: AsyncSession):
    audit_entry = AuditLog(
        user_id=user.id,
        action=action,
        description=description
    )
    db.add(audit_entry)
    await db.flush()
    await db.refresh(audit_entry)
    return audit_entry
