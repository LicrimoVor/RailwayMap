from __future__ import annotations

from decimal import Decimal
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import TimestampMixin


class RailwayEvent(TimestampMixin, Base):
    __tablename__ = "railway_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_type_id: Mapped[int] = mapped_column(
        ForeignKey("event_types.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    segment_id: Mapped[int] = mapped_column(
        ForeignKey("railway_segments.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    start_km: Mapped[int] = mapped_column(Integer, nullable=False)
    start_pk: Mapped[int] = mapped_column(Integer, nullable=False)
    end_km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    end_pk: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_offset: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    end_offset: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    geometry: Mapped[Any] = mapped_column(
        Geometry(geometry_type="GEOMETRY", srid=4326, spatial_index=True),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str | None] = mapped_column(String(32), nullable=True)

    event_type: Mapped["EventType"] = relationship(back_populates="events")
    segment: Mapped["RailwaySegment"] = relationship(back_populates="events")
