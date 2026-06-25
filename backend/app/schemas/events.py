from datetime import date, datetime
from decimal import Decimal

from pydantic import Field

from app.schemas.common import GeometryJson, OrmModel


class EventTypeBase(OrmModel):
    name: str
    color: str
    icon: str | None = None


class EventTypeCreate(EventTypeBase):
    pass


class EventTypeRead(EventTypeBase):
    id: int


class RailwayEventBase(OrmModel):
    event_type_id: int
    segment_id: int
    start_km: int = Field(ge=0)
    start_pk: int = Field(ge=0)
    end_km: int | None = Field(default=None, ge=0)
    end_pk: int | None = Field(default=None, ge=0)
    start_offset: Decimal | None = Field(default=None, ge=0)
    end_offset: Decimal | None = Field(default=None, ge=0)
    geometry: GeometryJson
    description: str | None = None
    severity: str | None = None


class RailwayEventCreate(RailwayEventBase):
    pass


class RailwayEventRead(RailwayEventBase):
    id: int
    created_at: datetime
    updated_at: datetime


class SegmentParameterBase(OrmModel):
    segment_id: int
    name: str
    value: str
    unit: str | None = None
    valid_from: date | None = None
    valid_to: date | None = None


class SegmentParameterCreate(SegmentParameterBase):
    pass


class SegmentParameterRead(SegmentParameterBase):
    id: int


class DefectBase(OrmModel):
    segment_id: int
    km: int = Field(ge=0)
    pk: int = Field(ge=0)
    type: str
    description: str | None = None
    severity: str | None = None
    geometry: GeometryJson
    status: str = "open"


class DefectCreate(DefectBase):
    pass


class DefectRead(DefectBase):
    id: int
    created_at: datetime


class LayerBase(OrmModel):
    name: str
    color: str
    visible: bool = True


class LayerCreate(LayerBase):
    pass


class LayerRead(LayerBase):
    id: int
