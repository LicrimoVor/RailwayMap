from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from shapely.geometry.base import BaseGeometry


@dataclass(frozen=True)
class OSMFeature:
    osm_id: int
    geometry: BaseGeometry
    properties: Mapping[str, Any]
    osm_type: str = "way"
