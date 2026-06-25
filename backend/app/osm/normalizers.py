from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any, Mapping

from shapely.geometry import LineString, MultiLineString, Point
from shapely.geometry.base import BaseGeometry
from shapely.ops import linemerge

from app.gis.measurements import linestring_length_m
from app.osm.features import OSMFeature


def is_missing(value: Any) -> bool:
    if value is None:
        return True
    if value != value:
        return True
    if isinstance(value, str) and not value.strip():
        return True
    return False


def clean_string(value: Any) -> str | None:
    if is_missing(value):
        return None
    return str(value).strip()


def first_string(properties: Mapping[str, Any], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        value = clean_string(properties.get(key))
        if value is not None:
            return value
    return None


def clean_tags(properties: Mapping[str, Any]) -> dict[str, str]:
    tags: dict[str, str] = {}
    for key, value in properties.items():
        cleaned_value = clean_string(value)
        if cleaned_value is not None:
            tags[str(key)] = cleaned_value
    return tags


def parse_int(value: Any) -> int | None:
    value = clean_string(value)
    if value is None:
        return None
    try:
        return int(Decimal(value))
    except (InvalidOperation, ValueError):
        return None


def parse_decimal(value: Any) -> Decimal | None:
    value = clean_string(value)
    if value is None:
        return None
    try:
        return Decimal(value)
    except InvalidOperation:
        return None


def parse_osm_id(value: Any) -> int | None:
    value = clean_string(value)
    if value is None:
        return None
    if "/" in value:
        value = value.rsplit("/", 1)[-1]
    try:
        return int(value)
    except ValueError:
        return None


def coerce_linestring(geometry: BaseGeometry) -> LineString | None:
    if geometry.is_empty:
        return None
    if isinstance(geometry, LineString):
        return geometry
    if isinstance(geometry, MultiLineString):
        merged = linemerge(geometry)
        if isinstance(merged, LineString):
            return merged
    return None


def coerce_point(geometry: BaseGeometry) -> Point | None:
    if geometry.is_empty:
        return None
    if isinstance(geometry, Point):
        return geometry
    return geometry.representative_point()


def railway_segment_values(feature: OSMFeature) -> dict[str, Any] | None:
    line = coerce_linestring(feature.geometry)
    if line is None:
        return None

    properties = feature.properties
    length_m = Decimal(f"{linestring_length_m(line):.2f}")

    return {
        "name": first_string(properties, ("name", "name:ru", "int_name", "name:en")),
        "branch": first_string(properties, ("branch", "line", "route")),
        "operator": first_string(properties, ("operator",)),
        "gauge": parse_int(properties.get("gauge")),
        "electrified": first_string(properties, ("electrified",)),
        "voltage": parse_int(properties.get("voltage")),
        "frequency": parse_decimal(properties.get("frequency")),
        "usage": first_string(properties, ("usage",)),
        "railway_type": first_string(properties, ("railway",)) or "rail",
        "passenger_lines": parse_int(properties.get("passenger_lines")),
        "length_m": length_m,
        "osm_tags": clean_tags(properties),
        "geometry": line,
    }


def station_values(feature: OSMFeature) -> dict[str, Any] | None:
    point = coerce_point(feature.geometry)
    if point is None:
        return None

    properties = feature.properties
    railway_type = first_string(properties, ("railway",)) or "station"
    fallback_name = f"{railway_type} {feature.osm_id}"

    return {
        "name": first_string(properties, ("name", "name:ru", "int_name", "name:en")) or fallback_name,
        "esr_code": first_string(properties, ("ref:esr", "esr_code", "railway:ref", "ref")),
        "railway_type": railway_type,
        "osm_tags": clean_tags(properties),
        "geometry": point,
    }
