from __future__ import annotations

from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import BigInteger, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


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
