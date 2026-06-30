from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from geoalchemy2.shape import from_shape, to_shape
from pydantic import BaseModel, Field
from shapely.geometry import Point, shape
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.spatial_filters import normalize_bbox, with_bbox_filter
from app.core.database import get_session
from app.libs.geojson import feature, feature_collection, json_value, model_properties
from app.models.events import Defect, EventType, Layer, RailwayEvent, SegmentParameter
from app.models.railway import RailwaySegment
from app.services.chunks import (
    rebuild_segment_chunks,
    rebuild_segment_sections_10km,
)

router = APIRouter(tags=["admin"])


class EventTypePayload(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    color: str = "#c93535"
    icon: str | None = None


class EventCreatePayload(BaseModel):
    segment_id: int
    event_type_id: int | None = None
    event_type: EventTypePayload | None = None
    start_km: int = Field(default=0, ge=0)
    start_pk: int = Field(default=0, ge=0)
    end_km: int | None = Field(default=None, ge=0)
    end_pk: int | None = Field(default=None, ge=0)
    start_offset: Decimal | None = Field(default=None, ge=0)
    end_offset: Decimal | None = Field(default=None, ge=0)
    geometry: dict[str, Any] | None = None
    description: str | None = None
    severity: str | None = None


class DefectCreatePayload(BaseModel):
    segment_id: int
    km: int = Field(default=0, ge=0)
    pk: int = Field(default=0, ge=0)
    type: str = Field(min_length=1, max_length=128)
    description: str | None = None
    severity: str | None = None
    status: str = "open"
    geometry: dict[str, Any] | None = None


class SegmentParameterPayload(BaseModel):
    segment_id: int
    name: str = Field(min_length=1, max_length=128)
    value: str = Field(min_length=1, max_length=255)
    unit: str | None = None
    valid_from: date | None = None
    valid_to: date | None = None


class LayerPayload(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    color: str = "#c93535"
    visible: bool = True


class RebuildChunksPayload(BaseModel):
    chunk_length_m: float = Field(default=100.0, gt=0, le=10_000)
    segment_ids: list[int] | None = None


class RebuildSections10kmPayload(BaseModel):
    section_length_m: float = Field(default=10_000.0, gt=0, le=100_000)
    segment_ids: list[int] | None = None


@router.get("/event-types")
def list_event_types(session: Session = Depends(get_session)) -> list[dict[str, Any]]:
    event_types = session.scalars(select(EventType).order_by(EventType.name)).all()
    return [event_type_dict(event_type) for event_type in event_types]


@router.post("/event-types", status_code=201)
def create_event_type(
    payload: EventTypePayload,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    event_type = get_or_create_event_type(session, payload)
    session.commit()
    session.refresh(event_type)
    return event_type_dict(event_type)


@router.get("/events")
def list_events(
    segment_id: int | None = Query(default=None),
    min_lon: float | None = Query(default=None, ge=-180, le=180),
    min_lat: float | None = Query(default=None, ge=-90, le=90),
    max_lon: float | None = Query(default=None, ge=-180, le=180),
    max_lat: float | None = Query(default=None, ge=-90, le=90),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    statement = select(RailwayEvent).options(selectinload(RailwayEvent.event_type)).order_by(
        RailwayEvent.created_at.desc(),
        RailwayEvent.id.desc(),
    )
    if segment_id is not None:
        statement = statement.where(RailwayEvent.segment_id == segment_id)
    bbox = normalize_bbox(min_lon, min_lat, max_lon, max_lat)
    if bbox is not None:
        statement = with_bbox_filter(statement, RailwayEvent.geometry, bbox)

    events = session.scalars(statement).all()
    return feature_collection([event_feature(event) for event in events])


@router.post("/events", status_code=201)
def create_event(
    payload: EventCreatePayload,
    session: Session = Depends(get_session),
) -> dict[str, object]:
    segment = require_segment(session, payload.segment_id)
    event_type = resolve_event_type(session, payload.event_type_id, payload.event_type)
    geometry = geometry_from_payload(payload.geometry, fallback=segment.geometry)

    event = RailwayEvent(
        event_type_id=event_type.id,
        segment_id=segment.id,
        start_km=payload.start_km,
        start_pk=payload.start_pk,
        end_km=payload.end_km,
        end_pk=payload.end_pk,
        start_offset=payload.start_offset,
        end_offset=payload.end_offset,
        geometry=geometry,
        description=payload.description,
        severity=payload.severity,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    event.event_type = event_type
    return event_feature(event)


@router.get("/defects")
def list_defects(
    segment_id: int | None = Query(default=None),
    min_lon: float | None = Query(default=None, ge=-180, le=180),
    min_lat: float | None = Query(default=None, ge=-90, le=90),
    max_lon: float | None = Query(default=None, ge=-180, le=180),
    max_lat: float | None = Query(default=None, ge=-90, le=90),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    statement = select(Defect).order_by(Defect.created_at.desc(), Defect.id.desc())
    if segment_id is not None:
        statement = statement.where(Defect.segment_id == segment_id)
    bbox = normalize_bbox(min_lon, min_lat, max_lon, max_lat)
    if bbox is not None:
        statement = with_bbox_filter(statement, Defect.geometry, bbox)

    defects = session.scalars(statement).all()
    return feature_collection([defect_feature(defect) for defect in defects])


@router.post("/defects", status_code=201)
def create_defect(
    payload: DefectCreatePayload,
    session: Session = Depends(get_session),
) -> dict[str, object]:
    segment = require_segment(session, payload.segment_id)
    geometry = geometry_from_payload(payload.geometry, fallback=segment.geometry, point=True)

    defect = Defect(
        segment_id=segment.id,
        km=payload.km,
        pk=payload.pk,
        type=payload.type,
        description=payload.description,
        severity=payload.severity,
        geometry=geometry,
        status=payload.status,
    )
    session.add(defect)
    session.commit()
    session.refresh(defect)
    return defect_feature(defect)


@router.get("/segment-parameters")
def list_segment_parameters(
    segment_id: int | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    statement = select(SegmentParameter).order_by(SegmentParameter.id.desc())
    if segment_id is not None:
        statement = statement.where(SegmentParameter.segment_id == segment_id)

    parameters = session.scalars(statement).all()
    return [parameter_dict(parameter) for parameter in parameters]


@router.post("/segment-parameters", status_code=201)
def create_segment_parameter(
    payload: SegmentParameterPayload,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    require_segment(session, payload.segment_id)
    parameter = SegmentParameter(**payload.model_dump())
    session.add(parameter)
    session.commit()
    session.refresh(parameter)
    return parameter_dict(parameter)


@router.get("/layers")
def list_layers(session: Session = Depends(get_session)) -> list[dict[str, Any]]:
    layers = session.scalars(select(Layer).order_by(Layer.id)).all()
    return [layer_dict(layer) for layer in layers]


@router.post("/layers", status_code=201)
def create_layer(payload: LayerPayload, session: Session = Depends(get_session)) -> dict[str, Any]:
    layer = Layer(**payload.model_dump())
    session.add(layer)
    session.commit()
    session.refresh(layer)
    return layer_dict(layer)


@router.post("/segment-chunks/rebuild")
def rebuild_chunks(
    payload: RebuildChunksPayload,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    created = rebuild_segment_chunks(
        session,
        chunk_length_m=payload.chunk_length_m,
        segment_ids=payload.segment_ids,
    )
    session.commit()
    return {"created": created, "chunk_length_m": payload.chunk_length_m}


@router.post("/segment-sections-10km/rebuild")
def rebuild_sections_10km(
    payload: RebuildSections10kmPayload,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    created = rebuild_segment_sections_10km(
        session,
        section_length_m=payload.section_length_m,
        segment_ids=payload.segment_ids,
    )
    session.commit()
    return {"created": created, "section_length_m": payload.section_length_m}


def require_segment(session: Session, segment_id: int) -> RailwaySegment:
    segment = session.get(RailwaySegment, segment_id)
    if segment is None:
        raise HTTPException(status_code=404, detail="Railway segment not found")
    return segment


def resolve_event_type(
    session: Session,
    event_type_id: int | None,
    payload: EventTypePayload | None,
) -> EventType:
    if event_type_id is not None:
        event_type = session.get(EventType, event_type_id)
        if event_type is None:
            raise HTTPException(status_code=404, detail="Event type not found")
        return event_type

    return get_or_create_event_type(session, payload or EventTypePayload(name="Custom event"))


def get_or_create_event_type(session: Session, payload: EventTypePayload) -> EventType:
    event_type = session.scalar(select(EventType).where(EventType.name == payload.name))
    if event_type is not None:
        event_type.color = payload.color
        event_type.icon = payload.icon
        session.flush()
        return event_type

    event_type = EventType(name=payload.name, color=payload.color, icon=payload.icon)
    session.add(event_type)
    session.flush()
    return event_type


def geometry_from_payload(
    payload: dict[str, Any] | None,
    fallback: Any,
    point: bool = False,
) -> Any:
    if payload is not None:
        return from_shape(shape(payload), srid=4326)

    fallback_shape = to_shape(fallback)
    if point:
        if fallback_shape.geom_type == "Point":
            return from_shape(fallback_shape, srid=4326)
        return from_shape(Point(fallback_shape.coords[0]), srid=4326)
    return fallback


def event_type_dict(event_type: EventType) -> dict[str, Any]:
    return model_properties(event_type, ("id", "name", "color", "icon"))


def event_feature(event: RailwayEvent) -> dict[str, object]:
    properties = model_properties(
        event,
        (
            "id",
            "event_type_id",
            "segment_id",
            "start_km",
            "start_pk",
            "end_km",
            "end_pk",
            "start_offset",
            "end_offset",
            "description",
            "severity",
            "created_at",
            "updated_at",
        ),
    )
    if event.event_type is not None:
        properties["event_type"] = event_type_dict(event.event_type)
        properties["event_type_name"] = event.event_type.name
        properties["event_type_color"] = event.event_type.color
    return feature(event.geometry, properties, feature_id=event.id)


def defect_feature(defect: Defect) -> dict[str, object]:
    properties = model_properties(
        defect,
        ("id", "segment_id", "km", "pk", "type", "description", "severity", "status", "created_at"),
    )
    return feature(defect.geometry, properties, feature_id=defect.id)


def parameter_dict(parameter: SegmentParameter) -> dict[str, Any]:
    return {
        "id": parameter.id,
        "segment_id": parameter.segment_id,
        "name": parameter.name,
        "value": parameter.value,
        "unit": parameter.unit,
        "valid_from": json_value(parameter.valid_from),
        "valid_to": json_value(parameter.valid_to),
    }


def layer_dict(layer: Layer) -> dict[str, Any]:
    return model_properties(layer, ("id", "name", "color", "visible"))
