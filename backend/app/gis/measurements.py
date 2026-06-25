from __future__ import annotations

from math import asin, cos, radians, sin, sqrt

from shapely.geometry import LineString

EARTH_RADIUS_M = 6_371_008.8


def haversine_distance_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    lat_delta = radians(lat2 - lat1)
    lon_delta = radians(lon2 - lon1)
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)

    a = sin(lat_delta / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(lon_delta / 2) ** 2
    return 2 * EARTH_RADIUS_M * asin(sqrt(a))


def linestring_length_m(line: LineString) -> float:
    coordinates = list(line.coords)
    if len(coordinates) < 2:
        return 0.0

    total = 0.0
    for start, end in zip(coordinates, coordinates[1:]):
        start_lon, start_lat = start[:2]
        end_lon, end_lat = end[:2]
        total += haversine_distance_m(start_lon, start_lat, end_lon, end_lat)
    return total
