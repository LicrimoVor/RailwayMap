from __future__ import annotations

from sqlalchemy import Boolean, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Layer(Base):
    __tablename__ = "layers"
    __table_args__ = (UniqueConstraint("name", name="uq_layers_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    color: Mapped[str] = mapped_column(String(32), nullable=False)
    visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
