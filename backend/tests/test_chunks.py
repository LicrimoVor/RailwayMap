from shapely.geometry import LineString

from app.gis.measurements import split_linestring_by_length_m


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
