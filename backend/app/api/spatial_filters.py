from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy import func


@dataclass(frozen=True)
class BoundingBox:
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float


def normalize_bbox(
    min_lon: float | None,
    min_lat: float | None,
    max_lon: float | None,
    max_lat: float | None,
) -> BoundingBox | None:
    if min_lon is None and min_lat is None and max_lon is None and max_lat is None:
        return None

    bbox = BoundingBox(
        min_lon=-180.0 if min_lon is None else min_lon,
        min_lat=-90.0 if min_lat is None else min_lat,
        max_lon=180.0 if max_lon is None else max_lon,
        max_lat=90.0 if max_lat is None else max_lat,
    )
    if bbox.min_lon >= bbox.max_lon:
        raise HTTPException(status_code=400, detail="min_lon must be less than max_lon")
    if bbox.min_lat >= bbox.max_lat:
        raise HTTPException(status_code=400, detail="min_lat must be less than max_lat")
    return bbox


def with_bbox_filter(statement, geometry_column, bbox: BoundingBox):
    envelope = func.ST_MakeEnvelope(
        bbox.min_lon,
        bbox.min_lat,
        bbox.max_lon,
        bbox.max_lat,
        4326,
    )
    return statement.where(func.ST_Intersects(geometry_column, envelope))
