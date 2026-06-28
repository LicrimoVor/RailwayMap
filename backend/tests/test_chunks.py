from shapely.geometry import LineString, MultiLineString

from app.libs.measurements import discretize_linestring_by_step_m, split_linestring_by_length_m
from app.osm.normalizers import coerce_linestrings


def test_linestring_can_be_split_into_roughly_100m_chunks() -> None:
    line = LineString([(37.0, 55.0), (37.01, 55.0)])

    chunks = split_linestring_by_length_m(line, chunk_length_m=100.0)

    assert len(chunks) > 5
    assert chunks[0][1] == 0.0
    assert chunks[0][3] <= 100.01
    assert chunks[-1][3] <= 100.01
    assert chunks[-1][2] > chunks[-1][1]


def test_short_linestring_stays_one_chunk() -> None:
    line = LineString([(37.0, 55.0), (37.0001, 55.0)])

    chunks = split_linestring_by_length_m(line, chunk_length_m=100.0)

    assert len(chunks) == 1
    assert list(chunks[0][4].coords)[0] == (37.0, 55.0)


def test_parallel_multiline_parts_can_be_split_independently() -> None:
    geometry = MultiLineString([
        [(37.0, 55.0), (37.01, 55.0)],
        [(37.0, 55.001), (37.01, 55.001)],
    ])

    lines = coerce_linestrings(geometry)
    chunks = [
        chunk
        for line in lines
        for chunk in split_linestring_by_length_m(line, chunk_length_m=100.0)
    ]

    assert len(lines) == 2
    assert len(chunks) > 10
    assert all(chunk[3] <= 100.01 for chunk in chunks)


def test_linestring_can_be_discretized_by_distance_step() -> None:
    line = LineString([(0.0, 0.0), (0.2, 0.0), (0.4, 0.0), (0.5, 0.0)])

    discretized = discretize_linestring_by_step_m(line, step_m=20_000.0)

    assert len(discretized.coords) == 4
    assert discretized.coords[0] == (0.0, 0.0)
    assert discretized.coords[-1] == (0.5, 0.0)
