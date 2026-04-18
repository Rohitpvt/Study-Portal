from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Favorite(Base, TimestampMixin):
    __tablename__ = "favorites"

    id:          Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id:     Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id: Mapped[str] = mapped_column(String(36), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)

    # Establish the relationships dynamically mapping backwards.
    user     = relationship("User", back_populates="favorites")
    material = relationship("Material")

    __table_args__ = (
        UniqueConstraint("user_id", "material_id", name="uq_user_material_favorite"),
    )

    def __repr__(self) -> str:
        return f"<Favorite {self.user_id} -> {self.material_id}>"
