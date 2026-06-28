from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from geoalchemy2.shape import to_shape
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.spatial_filters import normalize_bbox, with_bbox_filter
from app.core.database import get_session
from app.libs.geojson import feature, feature_collection, model_properties, shape_feature
from app.libs.measurements import discretize_linestring_by_step_m
from app.models.railway import (
    RailwaySegment,
    RailwaySegmentChunk,
    RailwaySegmentSection50km,
    Station,
)

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

SECTION_50KM_FIELDS = (
    "id",
    "segment_id",
    "section_index",
    "start_offset_m",
    "end_offset_m",
    "length_m",
)


@router.get("/segments")
def list_segments(
    min_lon: float | None = Query(default=None, ge=-180, le=180),
    min_lat: float | None = Query(default=None, ge=-90, le=90),
    max_lon: float | None = Query(default=None, ge=-180, le=180),
    max_lat: float | None = Query(default=None, ge=-90, le=90),
    sample_step_m: float | None = Query(default=None, ge=1_000, le=100_000),
    limit: int = Query(default=25_000, ge=1, le=100_000),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    statement = select(RailwaySegment).order_by(RailwaySegment.id)
    bbox = normalize_bbox(min_lon, min_lat, max_lon, max_lat)
    if bbox is not None:
        statement = with_bbox_filter(statement, RailwaySegment.geometry, bbox)
    segments = session.scalars(statement.offset(offset).limit(limit)).all()
    return feature_collection(
        [segment_feature(segment, sample_step_m=sample_step_m) for segment in segments]
    )


@router.get("/segments/{segment_id}")
def get_segment(segment_id: int, session: Session = Depends(get_session)) -> dict[str, object]:
    segment = session.get(RailwaySegment, segment_id)
    if segment is None:
        raise HTTPException(status_code=404, detail="Railway segment not found")
    return segment_feature(segment)


@router.get("/segment-chunks")
def list_segment_chunks(
    segment_id: int | None = Query(default=None),
    start_offset_m: float | None = Query(default=None, ge=0),
    end_offset_m: float | None = Query(default=None, ge=0),
    min_lon: float | None = Query(default=None, ge=-180, le=180),
    min_lat: float | None = Query(default=None, ge=-90, le=90),
    max_lon: float | None = Query(default=None, ge=-180, le=180),
    max_lat: float | None = Query(default=None, ge=-90, le=90),
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
    if start_offset_m is not None:
        statement = statement.where(RailwaySegmentChunk.end_offset_m > start_offset_m)
    if end_offset_m is not None:
        statement = statement.where(RailwaySegmentChunk.start_offset_m < end_offset_m)
    bbox = normalize_bbox(min_lon, min_lat, max_lon, max_lat)
    if bbox is not None:
        statement = with_bbox_filter(statement, RailwaySegmentChunk.geometry, bbox)

    chunks = session.scalars(statement.offset(offset).limit(limit)).all()
    return feature_collection([chunk_feature(chunk) for chunk in chunks])


@router.get("/segment-sections-50km")
def list_segment_sections_50km(
    segment_id: int | None = Query(default=None),
    min_lon: float | None = Query(default=None, ge=-180, le=180),
    min_lat: float | None = Query(default=None, ge=-90, le=90),
    max_lon: float | None = Query(default=None, ge=-180, le=180),
    max_lat: float | None = Query(default=None, ge=-90, le=90),
    limit: int = Query(default=50_000, ge=1, le=100_000),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    statement = (
        select(RailwaySegmentSection50km)
        .options(selectinload(RailwaySegmentSection50km.segment))
        .order_by(
            RailwaySegmentSection50km.segment_id,
            RailwaySegmentSection50km.section_index,
        )
    )
    if segment_id is not None:
        statement = statement.where(RailwaySegmentSection50km.segment_id == segment_id)
    bbox = normalize_bbox(min_lon, min_lat, max_lon, max_lat)
    if bbox is not None:
        statement = with_bbox_filter(statement, RailwaySegmentSection50km.geometry, bbox)

    sections = session.scalars(statement.offset(offset).limit(limit)).all()
    return feature_collection([section_50km_feature(section) for section in sections])


@router.get("/stations")
def list_stations(
    min_lon: float | None = Query(default=None, ge=-180, le=180),
    min_lat: float | None = Query(default=None, ge=-90, le=90),
    max_lon: float | None = Query(default=None, ge=-180, le=180),
    max_lat: float | None = Query(default=None, ge=-90, le=90),
    limit: int = Query(default=25_000, ge=1, le=100_000),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    statement = select(Station).order_by(Station.id)
    bbox = normalize_bbox(min_lon, min_lat, max_lon, max_lat)
    if bbox is not None:
        statement = with_bbox_filter(statement, Station.geometry, bbox)
    stations = session.scalars(statement.offset(offset).limit(limit)).all()
    return feature_collection([station_feature(station) for station in stations])


def segment_feature(segment: RailwaySegment, sample_step_m: float | None = None) -> dict[str, object]:
    properties = model_properties(segment, SEGMENT_FIELDS)
    if sample_step_m is not None:
        geometry = discretize_linestring_by_step_m(to_shape(segment.geometry), sample_step_m)
        return shape_feature(geometry, properties, feature_id=segment.id)
    return feature(segment.geometry, properties, feature_id=segment.id)


def station_feature(station: Station) -> dict[str, object]:
    properties = model_properties(station, STATION_FIELDS)
    return feature(station.geometry, properties, feature_id=station.id)


def chunk_feature(chunk: RailwaySegmentChunk) -> dict[str, object]:
    properties = model_properties(chunk, CHUNK_FIELDS)
    return feature(chunk.geometry, properties, feature_id=chunk.id)


def section_50km_feature(section: RailwaySegmentSection50km) -> dict[str, object]:
    return section_feature(section, SECTION_50KM_FIELDS)


def section_feature(section, section_fields: tuple[str, ...]) -> dict[str, object]:
    segment_properties = model_properties(section.segment, SEGMENT_FIELDS)
    section_properties = model_properties(section, section_fields)
    properties = {
        **segment_properties,
        "id": section.segment_id,
        "section_id": section.id,
        "section_index": section.section_index,
        "section_start_offset_m": section_properties["start_offset_m"],
        "section_end_offset_m": section_properties["end_offset_m"],
        "section_length_m": section_properties["length_m"],
    }
    return feature(section.geometry, properties, feature_id=section.id)
