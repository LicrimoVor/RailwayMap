from __future__ import annotations

from decimal import Decimal

from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import LineString
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.libs.measurements import split_linestring_by_length_m
from app.models.railway import (
    RailwaySegment,
    RailwaySegmentChunk,
    RailwaySegmentSection10km,
)


DEFAULT_CHUNK_LENGTH_M = 100.0
DEFAULT_SECTION_LENGTH_M = 10_000.0


def segment_chunks_from_line(
    line: LineString,
    chunk_length_m: float = DEFAULT_CHUNK_LENGTH_M,
) -> list[RailwaySegmentChunk]:
    return [
        RailwaySegmentChunk(
            chunk_index=chunk_index,
            start_offset_m=_decimal_m(start_m),
            end_offset_m=_decimal_m(end_m),
            length_m=_decimal_m(length_m),
            geometry=from_shape(chunk_line, srid=4326),
        )
        for chunk_index, start_m, end_m, length_m, chunk_line in split_linestring_by_length_m(
            line,
            chunk_length_m=chunk_length_m,
        )
    ]


def segment_sections_10km_from_line(
    line: LineString,
    section_length_m: float = DEFAULT_SECTION_LENGTH_M,
) -> list[RailwaySegmentSection10km]:
    return [
        RailwaySegmentSection10km(
            section_index=section_index,
            start_offset_m=_decimal_m(start_m),
            end_offset_m=_decimal_m(end_m),
            length_m=_decimal_m(length_m),
            geometry=from_shape(section_line, srid=4326),
        )
        for section_index, start_m, end_m, length_m, section_line in split_linestring_by_length_m(
            line,
            chunk_length_m=section_length_m,
        )
    ]


def rebuild_segment_chunks(
    session: Session,
    chunk_length_m: float = DEFAULT_CHUNK_LENGTH_M,
    segment_ids: list[int] | None = None,
    flush_every: int = 1_000,
) -> int:
    delete_statement = delete(RailwaySegmentChunk)
    if segment_ids is not None:
        delete_statement = delete_statement.where(RailwaySegmentChunk.segment_id.in_(segment_ids))
    session.execute(delete_statement)
    session.flush()

    select_statement = select(RailwaySegment).order_by(RailwaySegment.id)
    if segment_ids is not None:
        select_statement = select_statement.where(RailwaySegment.id.in_(segment_ids))

    created = 0
    for segment in session.scalars(select_statement):
        line = to_shape(segment.geometry)
        for chunk_index, start_m, end_m, length_m, chunk_line in split_linestring_by_length_m(
            line,
            chunk_length_m=chunk_length_m,
        ):
            session.add(
                RailwaySegmentChunk(
                    segment_id=segment.id,
                    chunk_index=chunk_index,
                    start_offset_m=_decimal_m(start_m),
                    end_offset_m=_decimal_m(end_m),
                    length_m=_decimal_m(length_m),
                    geometry=from_shape(chunk_line, srid=4326),
                )
            )
            created += 1
            if created % flush_every == 0:
                session.flush()

    session.flush()
    return created


def rebuild_segment_sections_10km(
    session: Session,
    section_length_m: float = DEFAULT_SECTION_LENGTH_M,
    segment_ids: list[int] | None = None,
    flush_every: int = 1_000,
) -> int:
    return _rebuild_segment_sections(
        session,
        section_model=RailwaySegmentSection10km,
        section_length_m=section_length_m,
        segment_ids=segment_ids,
        flush_every=flush_every,
    )


def _rebuild_segment_sections(
    session: Session,
    *,
    section_model,
    section_length_m: float,
    segment_ids: list[int] | None,
    flush_every: int,
) -> int:
    delete_statement = delete(section_model)
    if segment_ids is not None:
        delete_statement = delete_statement.where(section_model.segment_id.in_(segment_ids))
    session.execute(delete_statement)
    session.flush()

    select_statement = select(RailwaySegment).order_by(RailwaySegment.id)
    if segment_ids is not None:
        select_statement = select_statement.where(RailwaySegment.id.in_(segment_ids))

    created = 0
    for segment in session.scalars(select_statement):
        line = to_shape(segment.geometry)
        for section_index, start_m, end_m, length_m, section_line in split_linestring_by_length_m(
            line,
            chunk_length_m=section_length_m,
        ):
            session.add(
                section_model(
                    segment_id=segment.id,
                    section_index=section_index,
                    start_offset_m=_decimal_m(start_m),
                    end_offset_m=_decimal_m(end_m),
                    length_m=_decimal_m(length_m),
                    geometry=from_shape(section_line, srid=4326),
                )
            )
            created += 1
            if created % flush_every == 0:
                session.flush()

    session.flush()
    return created


def _decimal_m(value: float) -> Decimal:
    return Decimal(f"{value:.2f}")
