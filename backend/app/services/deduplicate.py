from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.orm import Session


@dataclass(frozen=True)
class DeduplicationResult:
    duplicate_segments_by_osm_id: int
    duplicate_segments_by_geometry: int
    duplicate_chunks: int
    duplicate_sections_10km: int

    @property
    def total(self) -> int:
        return (
            self.duplicate_segments_by_osm_id
            + self.duplicate_segments_by_geometry
            + self.duplicate_chunks
            + self.duplicate_sections_10km
        )


SEGMENT_SOURCE_DUPLICATES = """
WITH ranked AS (
    SELECT
        id,
        row_number() OVER (
            PARTITION BY osm_type, osm_id
            ORDER BY id
        ) AS row_number
    FROM railway_segments
    WHERE osm_id IS NOT NULL
)
SELECT id
FROM ranked
WHERE row_number > 1
"""

SEGMENT_GEOMETRY_DUPLICATES = """
WITH ranked AS (
    SELECT
        id,
        row_number() OVER (
            PARTITION BY
                osm_type,
                railway_type,
                coalesce(name, ''),
                coalesce(branch, ''),
                coalesce(operator, ''),
                encode(ST_AsEWKB(geometry), 'hex')
            ORDER BY id
        ) AS row_number
    FROM railway_segments
    WHERE osm_id IS NULL
)
SELECT id
FROM ranked
WHERE row_number > 1
"""

CHUNK_DUPLICATES = """
WITH ranked AS (
    SELECT
        id,
        row_number() OVER (
            PARTITION BY
                segment_id,
                start_offset_m,
                end_offset_m,
                encode(ST_AsEWKB(geometry), 'hex')
            ORDER BY id
        ) AS row_number
    FROM railway_segment_chunks
)
SELECT id
FROM ranked
WHERE row_number > 1
"""

SECTION_10KM_DUPLICATES = """
WITH ranked AS (
    SELECT
        id,
        row_number() OVER (
            PARTITION BY
                segment_id,
                start_offset_m,
                end_offset_m,
                encode(ST_AsEWKB(geometry), 'hex')
            ORDER BY id
        ) AS row_number
    FROM railway_segment_sections_10km
)
SELECT id
FROM ranked
WHERE row_number > 1
"""


def remove_duplicate_railway_rows(
    session: Session,
    *,
    include_segments: bool = True,
    include_chunks: bool = True,
    include_sections_10km: bool = True,
    dry_run: bool = True,
) -> DeduplicationResult:
    duplicate_chunks = _count_duplicate_ids(session, CHUNK_DUPLICATES) if include_chunks else 0
    duplicate_sections_10km = (
        _count_duplicate_ids(session, SECTION_10KM_DUPLICATES) if include_sections_10km else 0
    )
    duplicate_segments_by_osm_id = (
        _count_duplicate_ids(session, SEGMENT_SOURCE_DUPLICATES) if include_segments else 0
    )
    duplicate_segments_by_geometry = (
        _count_duplicate_ids(session, SEGMENT_GEOMETRY_DUPLICATES) if include_segments else 0
    )

    if not dry_run:
        if include_chunks:
            _delete_duplicate_ids(session, "railway_segment_chunks", CHUNK_DUPLICATES)
        if include_sections_10km:
            _delete_duplicate_ids(session, "railway_segment_sections_10km", SECTION_10KM_DUPLICATES)
        if include_segments:
            _delete_duplicate_ids(session, "railway_segments", SEGMENT_SOURCE_DUPLICATES)
            _delete_duplicate_ids(session, "railway_segments", SEGMENT_GEOMETRY_DUPLICATES)

    return DeduplicationResult(
        duplicate_segments_by_osm_id=duplicate_segments_by_osm_id,
        duplicate_segments_by_geometry=duplicate_segments_by_geometry,
        duplicate_chunks=duplicate_chunks,
        duplicate_sections_10km=duplicate_sections_10km,
    )


def _count_duplicate_ids(session: Session, duplicate_ids_sql: str) -> int:
    statement = text(f"SELECT count(*) FROM ({duplicate_ids_sql}) AS duplicate_ids")
    return int(session.execute(statement).scalar_one())


def _delete_duplicate_ids(session: Session, table_name: str, duplicate_ids_sql: str) -> None:
    statement = text(
        f"""
        DELETE FROM {table_name}
        WHERE id IN ({duplicate_ids_sql})
        """
    )
    session.execute(statement)
