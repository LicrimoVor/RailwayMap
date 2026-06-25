from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import CreatedAtMixin, TimestampMixin


class EventType(Base):
    __tablename__ = "event_types"
    __table_args__ = (UniqueConstraint("name", name="uq_event_types_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    color: Mapped[str] = mapped_column(String(32), nullable=False)
    icon: Mapped[str | None] = mapped_column(String(64), nullable=True)

    events: Mapped[list[RailwayEvent]] = relationship(back_populates="event_type")


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

    event_type: Mapped[EventType] = relationship(back_populates="events")
    segment: Mapped[RailwaySegment] = relationship(back_populates="events")


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

    segment: Mapped[RailwaySegment] = relationship(back_populates="parameters")


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

    segment: Mapped[RailwaySegment] = relationship(back_populates="defects")


class Layer(Base):
    __tablename__ = "layers"
    __table_args__ = (UniqueConstraint("name", name="uq_layers_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    color: Mapped[str] = mapped_column(String(32), nullable=False)
    visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


from app.models.railway import RailwaySegment  # noqa: E402
