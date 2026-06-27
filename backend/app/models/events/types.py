from __future__ import annotations

from sqlalchemy import Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class EventType(Base):
    __tablename__ = "event_types"
    __table_args__ = (UniqueConstraint("name", name="uq_event_types_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    color: Mapped[str] = mapped_column(String(32), nullable=False)
    icon: Mapped[str | None] = mapped_column(String(64), nullable=True)

    events: Mapped[list["RailwayEvent"]] = relationship(back_populates="event_type")
