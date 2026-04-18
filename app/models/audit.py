from datetime import datetime

from sqlalchemy import String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import generate_uuid

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id:          Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id:     Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action:      Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    timestamp:   Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())

    user = relationship("User", backref="audit_logs")
