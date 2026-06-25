from __future__ import annotations

from collections.abc import Mapping
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from geoalchemy2.shape import to_shape
from shapely.geometry import mapping


def json_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, date | datetime):
        return value.isoformat()
    return value


def model_properties(model: Any, fields: tuple[str, ...]) -> dict[str, Any]:
    return {field: json_value(getattr(model, field)) for field in fields}


def geometry_to_geojson(geometry: Any) -> dict[str, Any]:
    return dict(mapping(to_shape(geometry)))


def feature(
    geometry: Any,
    properties: Mapping[str, Any],
    feature_id: str | int | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "type": "Feature",
        "geometry": geometry_to_geojson(geometry),
        "properties": dict(properties),
    }
    if feature_id is not None:
        payload["id"] = feature_id
    return payload


def feature_collection(features: list[dict[str, Any]]) -> dict[str, Any]:
    return {"type": "FeatureCollection", "features": features}
