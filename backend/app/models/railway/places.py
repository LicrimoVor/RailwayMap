from __future__ import annotations

from decimal import Decimal
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import ForeignKey, Index, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class City(Base):
    __tablename__ = "cities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    population: Mapped[int | None] = mapped_column(Integer, nullable=True)
    geometry: Mapped[Any] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=True),
        nullable=False,
    )


class KilometerPoint(Base):
    __tablename__ = "kilometer_points"
    __table_args__ = (
        UniqueConstraint("segment_id", "km", "pk", name="uq_kilometer_points_segment_km_pk"),
        Index("ix_kilometer_points_km_pk", "km", "pk"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    segment_id: Mapped[int] = mapped_column(
        ForeignKey("railway_segments.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    km: Mapped[int] = mapped_column(Integer, nullable=False)
    pk: Mapped[int] = mapped_column(Integer, nullable=False)
    offset_m: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    geometry: Mapped[Any] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=True),
        nullable=False,
    )

    segment: Mapped["RailwaySegment"] = relationship(back_populates="kilometer_points")
