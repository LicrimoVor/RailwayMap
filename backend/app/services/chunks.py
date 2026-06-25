from __future__ import annotations

from decimal import Decimal

from geoalchemy2.shape import from_shape, to_shape
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.gis.measurements import split_linestring_by_length_m
from app.models.railway import RailwaySegment, RailwaySegmentChunk


def rebuild_segment_chunks(
    session: Session,
    chunk_length_m: float = 100.0,
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
                    start_offset_m=Decimal(f"{start_m:.2f}"),
                    end_offset_m=Decimal(f"{end_m:.2f}"),
                    length_m=Decimal(f"{length_m:.2f}"),
                    geometry=from_shape(chunk_line, srid=4326),
                )
            )
            created += 1
            if created % flush_every == 0:
                session.flush()

    session.flush()
    return created
