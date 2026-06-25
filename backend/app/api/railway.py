from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.geojson import feature, feature_collection, model_properties
from app.core.database import get_session
from app.models.railway import RailwaySegment, RailwaySegmentChunk, Station

router = APIRouter(tags=["railway"])

SEGMENT_FIELDS = (
    "id",
    "osm_type",
    "osm_id",
    "name",
    "branch",
    "operator",
    "gauge",
    "electrified",
    "voltage",
    "frequency",
    "usage",
    "railway_type",
    "passenger_lines",
    "length_m",
    "osm_tags",
)

STATION_FIELDS = (
    "id",
    "osm_type",
    "osm_id",
    "name",
    "esr_code",
    "railway_type",
    "osm_tags",
)

CHUNK_FIELDS = (
    "id",
    "segment_id",
    "chunk_index",
    "start_offset_m",
    "end_offset_m",
    "length_m",
)


@router.get("/segments")
def list_segments(
    limit: int = Query(default=25_000, ge=1, le=100_000),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    statement = select(RailwaySegment).order_by(RailwaySegment.id).offset(offset).limit(limit)
    segments = session.scalars(statement).all()
    return feature_collection([segment_feature(segment) for segment in segments])


@router.get("/segments/{segment_id}")
def get_segment(segment_id: int, session: Session = Depends(get_session)) -> dict[str, object]:
    segment = session.get(RailwaySegment, segment_id)
    if segment is None:
        raise HTTPException(status_code=404, detail="Railway segment not found")
    return segment_feature(segment)


@router.get("/segment-chunks")
def list_segment_chunks(
    segment_id: int | None = Query(default=None),
    limit: int = Query(default=50_000, ge=1, le=100_000),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    statement = select(RailwaySegmentChunk).order_by(
        RailwaySegmentChunk.segment_id,
        RailwaySegmentChunk.chunk_index,
    )
    if segment_id is not None:
        statement = statement.where(RailwaySegmentChunk.segment_id == segment_id)

    chunks = session.scalars(statement.offset(offset).limit(limit)).all()
    return feature_collection([chunk_feature(chunk) for chunk in chunks])


@router.get("/stations")
def list_stations(
    limit: int = Query(default=25_000, ge=1, le=100_000),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    statement = select(Station).order_by(Station.id).offset(offset).limit(limit)
    stations = session.scalars(statement).all()
    return feature_collection([station_feature(station) for station in stations])


def segment_feature(segment: RailwaySegment) -> dict[str, object]:
    properties = model_properties(segment, SEGMENT_FIELDS)
    return feature(segment.geometry, properties, feature_id=segment.id)


def station_feature(station: Station) -> dict[str, object]:
    properties = model_properties(station, STATION_FIELDS)
    return feature(station.geometry, properties, feature_id=station.id)


def chunk_feature(chunk: RailwaySegmentChunk) -> dict[str, object]:
    properties = model_properties(chunk, CHUNK_FIELDS)
    return feature(chunk.geometry, properties, feature_id=chunk.id)
