from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path
from typing import Iterable

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from geoalchemy2.shape import to_shape
from sqlalchemy import create_engine, select
from sqlalchemy.orm import selectinload, sessionmaker

from app.core.config import get_settings
from app.models.railway import RailwaySegmentChunk, RailwaySegmentSection10km

CSV_FIELDS = [
    "section_type",
    "section_id",
    "segment_id",
    "index",
    "start_offset_m",
    "end_offset_m",
    "length_m",
    "osm_type",
    "osm_id",
    "name",
    "branch",
    "operator",
    "railway_type",
    "gauge",
    "electrified",
    "voltage",
    "frequency",
    "usage",
    "geometry_wkt",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export railway sections to CSV.")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/railway_sections.csv"),
        help="CSV output path.",
    )
    parser.add_argument("--database-url", default=None, help="SQLAlchemy database URL.")
    parser.add_argument(
        "--kind",
        choices=("all", "100m", "10km"),
        default="all",
        help="Which section table to export.",
    )
    parser.add_argument("--no-geometry", action="store_true", help="Do not include WKT geometry.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    database_url = args.database_url or get_settings().database_url
    engine = create_engine(database_url, pool_pre_ping=True)
    session_factory = sessionmaker(bind=engine, autoflush=True, autocommit=False)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    row_count = 0

    with session_factory() as session, args.output.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=CSV_FIELDS)
        writer.writeheader()

        if args.kind in ("all", "10km"):
            for row in iter_10km_rows(session, include_geometry=not args.no_geometry):
                writer.writerow(row)
                row_count += 1

        if args.kind in ("all", "100m"):
            for row in iter_100m_rows(session, include_geometry=not args.no_geometry):
                writer.writerow(row)
                row_count += 1

    print(f"Exported {row_count} railway sections to {args.output}")
    return 0


def iter_10km_rows(session, include_geometry: bool) -> Iterable[dict[str, object]]:
    statement = (
        select(RailwaySegmentSection10km)
        .options(selectinload(RailwaySegmentSection10km.segment))
        .order_by(RailwaySegmentSection10km.segment_id, RailwaySegmentSection10km.section_index)
    )
    for section in session.scalars(statement).yield_per(2_000):
        yield section_row(
            section_type="10km",
            section_id=section.id,
            segment=section.segment,
            index=section.section_index,
            start_offset_m=section.start_offset_m,
            end_offset_m=section.end_offset_m,
            length_m=section.length_m,
            geometry=section.geometry,
            include_geometry=include_geometry,
        )


def iter_100m_rows(session, include_geometry: bool) -> Iterable[dict[str, object]]:
    statement = (
        select(RailwaySegmentChunk)
        .options(selectinload(RailwaySegmentChunk.segment))
        .order_by(RailwaySegmentChunk.segment_id, RailwaySegmentChunk.chunk_index)
    )
    for chunk in session.scalars(statement).yield_per(5_000):
        yield section_row(
            section_type="100m",
            section_id=chunk.id,
            segment=chunk.segment,
            index=chunk.chunk_index,
            start_offset_m=chunk.start_offset_m,
            end_offset_m=chunk.end_offset_m,
            length_m=chunk.length_m,
            geometry=chunk.geometry,
            include_geometry=include_geometry,
        )


def section_row(
    section_type: str,
    section_id: int,
    segment,
    index,
    start_offset_m,
    end_offset_m,
    length_m,
    geometry,
    include_geometry: bool,
) -> dict[str, object]:
    return {
        "section_type": section_type,
        "section_id": section_id,
        "segment_id": segment.id,
        "index": index,
        "start_offset_m": start_offset_m,
        "end_offset_m": end_offset_m,
        "length_m": length_m,
        "osm_type": segment.osm_type,
        "osm_id": segment.osm_id,
        "name": segment.name,
        "branch": segment.branch,
        "operator": segment.operator,
        "railway_type": segment.railway_type,
        "gauge": segment.gauge,
        "electrified": segment.electrified,
        "voltage": segment.voltage,
        "frequency": segment.frequency,
        "usage": segment.usage,
        "geometry_wkt": to_shape(geometry).wkt if include_geometry else "",
    }


if __name__ == "__main__":
    raise SystemExit(main())
