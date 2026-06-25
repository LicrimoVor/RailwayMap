from __future__ import annotations

from decimal import Decimal
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import BigInteger, ForeignKey, Index, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import TimestampMixin


class RailwaySegment(TimestampMixin, Base):
    __tablename__ = "railway_segments"
    __table_args__ = (UniqueConstraint("osm_type", "osm_id", name="uq_railway_segments_osm_type_osm_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    osm_type: Mapped[str] = mapped_column(String(16), default="way", nullable=False)
    osm_id: Mapped[int | None] = mapped_column(BigInteger, index=True, nullable=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    branch: Mapped[str | None] = mapped_column(String(255), nullable=True)
    operator: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gauge: Mapped[int | None] = mapped_column(Integer, nullable=True)
    electrified: Mapped[str | None] = mapped_column(String(64), nullable=True)
    voltage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    frequency: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    usage: Mapped[str | None] = mapped_column(String(64), nullable=True)
    railway_type: Mapped[str] = mapped_column(String(64), default="rail", nullable=False)
    passenger_lines: Mapped[int | None] = mapped_column(Integer, nullable=True)
    length_m: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    osm_tags: Mapped[dict[str, str]] = mapped_column(JSONB, default=dict, nullable=False)
    geometry: Mapped[Any] = mapped_column(
        Geometry(geometry_type="LINESTRING", srid=4326, spatial_index=True),
        nullable=False,
    )

    kilometer_points: Mapped[list[KilometerPoint]] = relationship(
        back_populates="segment",
        cascade="all, delete-orphan",
    )
    events: Mapped[list[RailwayEvent]] = relationship(
        back_populates="segment",
        cascade="all, delete-orphan",
    )
    parameters: Mapped[list[SegmentParameter]] = relationship(
        back_populates="segment",
        cascade="all, delete-orphan",
    )
    defects: Mapped[list[Defect]] = relationship(
        back_populates="segment",
        cascade="all, delete-orphan",
    )
    chunks: Mapped[list[RailwaySegmentChunk]] = relationship(
        back_populates="segment",
        cascade="all, delete-orphan",
    )


class RailwaySegmentChunk(Base):
    __tablename__ = "railway_segment_chunks"
    __table_args__ = (
        UniqueConstraint("segment_id", "chunk_index", name="uq_railway_segment_chunks_segment_index"),
        Index("ix_railway_segment_chunks_segment_offsets", "segment_id", "start_offset_m", "end_offset_m"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    segment_id: Mapped[int] = mapped_column(
        ForeignKey("railway_segments.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    start_offset_m: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    end_offset_m: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    length_m: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    geometry: Mapped[Any] = mapped_column(
        Geometry(geometry_type="LINESTRING", srid=4326, spatial_index=True),
        nullable=False,
    )

    segment: Mapped[RailwaySegment] = relationship(back_populates="chunks")


class Station(Base):
    __tablename__ = "stations"
    __table_args__ = (UniqueConstraint("osm_type", "osm_id", name="uq_stations_osm_type_osm_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    osm_type: Mapped[str] = mapped_column(String(16), default="node", nullable=False)
    osm_id: Mapped[int | None] = mapped_column(BigInteger, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    esr_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    railway_type: Mapped[str] = mapped_column(String(64), default="station", nullable=False)
    osm_tags: Mapped[dict[str, str]] = mapped_column(JSONB, default=dict, nullable=False)
    geometry: Mapped[Any] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=True),
        nullable=False,
    )


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

    segment: Mapped[RailwaySegment] = relationship(back_populates="kilometer_points")


from app.models.events import Defect, RailwayEvent, SegmentParameter  # noqa: E402
