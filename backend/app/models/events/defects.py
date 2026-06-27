from __future__ import annotations

from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import CreatedAtMixin


class Defect(CreatedAtMixin, Base):
    __tablename__ = "defects"
    __table_args__ = (Index("ix_defects_km_pk", "km", "pk"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    segment_id: Mapped[int] = mapped_column(
        ForeignKey("railway_segments.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    km: Mapped[int] = mapped_column(Integer, nullable=False)
    pk: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str | None] = mapped_column(String(32), nullable=True)
    geometry: Mapped[Any] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=True),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(32), default="open", nullable=False)

    segment: Mapped["RailwaySegment"] = relationship(back_populates="defects")
