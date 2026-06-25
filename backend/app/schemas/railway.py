from decimal import Decimal

from pydantic import Field

from app.schemas.common import GeometryJson, OrmModel


class RailwaySegmentBase(OrmModel):
    osm_type: str = "way"
    osm_id: int | None = None
    name: str | None = None
    branch: str | None = None
    operator: str | None = None
    gauge: int | None = None
    electrified: str | None = None
    voltage: int | None = None
    frequency: Decimal | None = None
    usage: str | None = None
    railway_type: str = "rail"
    passenger_lines: int | None = None
    length_m: Decimal | None = None
    osm_tags: dict[str, str] = Field(default_factory=dict)
    geometry: GeometryJson


class RailwaySegmentCreate(RailwaySegmentBase):
    pass


class RailwaySegmentRead(RailwaySegmentBase):
    id: int


class StationBase(OrmModel):
    osm_type: str = "node"
    osm_id: int | None = None
    name: str
    esr_code: str | None = None
    railway_type: str = "station"
    osm_tags: dict[str, str] = Field(default_factory=dict)
    geometry: GeometryJson


class StationCreate(StationBase):
    pass


class StationRead(StationBase):
    id: int


class CityBase(OrmModel):
    name: str
    population: int | None = None
    geometry: GeometryJson


class CityCreate(CityBase):
    pass


class CityRead(CityBase):
    id: int


class KilometerPointBase(OrmModel):
    segment_id: int
    km: int = Field(ge=0)
    pk: int = Field(ge=0)
    offset_m: Decimal = Field(ge=0)
    geometry: GeometryJson


class KilometerPointCreate(KilometerPointBase):
    pass


class KilometerPointRead(KilometerPointBase):
    id: int
