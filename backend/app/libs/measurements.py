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


def split_linestring_by_length_m(
    line: LineString,
    chunk_length_m: float = 100.0,
) -> list[tuple[int, float, float, float, LineString]]:
    coordinates = list(line.coords)
    if len(coordinates) < 2:
        return []

    cumulative = [0.0]
    for start, end in zip(coordinates, coordinates[1:]):
        start_lon, start_lat = start[:2]
        end_lon, end_lat = end[:2]
        cumulative.append(
            cumulative[-1] + haversine_distance_m(start_lon, start_lat, end_lon, end_lat)
        )

    total_length = cumulative[-1]
    if total_length <= 0:
        return []

    chunks: list[tuple[int, float, float, float, LineString]] = []
    start_m = 0.0
    index = 0

    while start_m < total_length:
        end_m = min(start_m + chunk_length_m, total_length)
        chunk_coordinates = [_point_at_distance(coordinates, cumulative, start_m)]

        for vertex_index, vertex_distance in enumerate(cumulative[1:-1], start=1):
            if start_m < vertex_distance < end_m:
                chunk_coordinates.append((coordinates[vertex_index][0], coordinates[vertex_index][1]))

        chunk_coordinates.append(_point_at_distance(coordinates, cumulative, end_m))
        chunk_coordinates = _dedupe_coordinates(chunk_coordinates)

        if len(chunk_coordinates) >= 2:
            chunks.append(
                (
                    index,
                    start_m,
                    end_m,
                    end_m - start_m,
                    LineString(chunk_coordinates),
                )
            )
            index += 1

        start_m = end_m

    return chunks


def discretize_linestring_by_step_m(line: LineString, step_m: float) -> LineString:
    if step_m <= 0:
        raise ValueError("step_m must be positive")

    coordinates = list(line.coords)
    if len(coordinates) < 2:
        return line

    cumulative = [0.0]
    for start, end in zip(coordinates, coordinates[1:]):
        start_lon, start_lat = start[:2]
        end_lon, end_lat = end[:2]
        cumulative.append(cumulative[-1] + haversine_distance_m(start_lon, start_lat, end_lon, end_lat))

    total_length = cumulative[-1]
    if total_length <= 0:
        return line

    distances = [0.0]
    distance_m = step_m
    while distance_m < total_length:
        distances.append(distance_m)
        distance_m += step_m
    distances.append(total_length)

    sampled_coordinates = _dedupe_coordinates(
        [_point_at_distance(coordinates, cumulative, distance_m) for distance_m in distances]
    )
    if len(sampled_coordinates) < 2:
        return line

    return LineString(sampled_coordinates)


def _point_at_distance(
    coordinates: list[tuple[float, ...]],
    cumulative: list[float],
    distance_m: float,
) -> tuple[float, float]:
    if distance_m <= 0:
        return coordinates[0][0], coordinates[0][1]
    if distance_m >= cumulative[-1]:
        return coordinates[-1][0], coordinates[-1][1]

    for index in range(1, len(cumulative)):
        if cumulative[index] >= distance_m:
            previous_distance = cumulative[index - 1]
            segment_length = cumulative[index] - previous_distance
            ratio = 0.0 if segment_length == 0 else (distance_m - previous_distance) / segment_length
            start = coordinates[index - 1]
            end = coordinates[index]
            lon = start[0] + (end[0] - start[0]) * ratio
            lat = start[1] + (end[1] - start[1]) * ratio
            return lon, lat

    return coordinates[-1][0], coordinates[-1][1]


def _dedupe_coordinates(coordinates: list[tuple[float, float]]) -> list[tuple[float, float]]:
    deduped: list[tuple[float, float]] = []
    for coordinate in coordinates:
        if not deduped or coordinate != deduped[-1]:
            deduped.append(coordinate)
    return deduped
