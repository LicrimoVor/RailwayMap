from __future__ import annotations

from datetime import date

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class SegmentParameter(Base):
    __tablename__ = "segment_parameters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    segment_id: Mapped[int] = mapped_column(
        ForeignKey("railway_segments.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    valid_from: Mapped[date | None] = mapped_column(nullable=True)
    valid_to: Mapped[date | None] = mapped_column(nullable=True)

    segment: Mapped["RailwaySegment"] = relationship(back_populates="parameters")
