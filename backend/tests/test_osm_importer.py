from decimal import Decimal

import pytest
from shapely.geometry import LineString, MultiLineString, Point, Polygon

from app.osm.features import OSMFeature
from app.osm.importer import OSMImporter
from app.osm.normalizers import (
    coerce_linestring,
    clean_tags,
    parse_osm_id,
    railway_segment_values,
    station_values,
)
from app.osm.readers import RAILWAY_FACILITY_VALUES, RAILWAY_LINE_VALUES


class FakeSession:
    def __init__(self) -> None:
        self.added = []
        self.flush_count = 0
        self.commit_count = 0

    def scalar(self, statement):
        return None

    def add(self, instance) -> None:
        self.added.append(instance)

    def flush(self) -> None:
        self.flush_count += 1

    def commit(self) -> None:
        self.commit_count += 1


def test_parse_osm_id_accepts_plain_and_typed_ids() -> None:
    assert parse_osm_id(123) == 123
    assert parse_osm_id("way/456") == 456
    assert parse_osm_id("not-an-id") is None


def test_railway_segment_values_normalize_tags_and_length() -> None:
    feature = OSMFeature(
        osm_id=10,
        geometry=LineString([(37.0, 55.0), (37.1, 55.1)]),
        properties={
            "name:ru": "Transsib",
            "branch": "V-SIB",
            "operator": "RZD",
            "gauge": "1520",
            "electrified": "contact_line",
            "voltage": "25000",
            "frequency": "50",
            "usage": "main",
            "railway": "rail",
            "passenger_lines": "2",
            "maxspeed": "90",
        },
    )

    values = railway_segment_values(feature)

    assert values is not None
    assert values["name"] == "Transsib"
    assert values["gauge"] == 1520
    assert values["voltage"] == 25000
    assert values["frequency"] == Decimal("50")
    assert values["passenger_lines"] == 2
    assert values["length_m"] > 0
    assert values["osm_tags"]["maxspeed"] == "90"


def test_station_values_use_representative_point_and_name_fallback() -> None:
    feature = OSMFeature(
        osm_id=20,
        geometry=Polygon([(37, 55), (37, 56), (38, 56), (38, 55), (37, 55)]),
        properties={"railway": "halt", "ref:esr": "123456"},
    )

    values = station_values(feature)

    assert values is not None
    assert values["name"] == "halt 20"
    assert values["esr_code"] == "123456"
    assert values["railway_type"] == "halt"
    assert isinstance(values["geometry"], Point)


def test_reader_filters_cover_tracks_and_depots() -> None:
    assert "rail" in RAILWAY_LINE_VALUES
    assert "construction" in RAILWAY_LINE_VALUES
    assert "depot" in RAILWAY_FACILITY_VALUES
    assert "workshop" in RAILWAY_FACILITY_VALUES
    assert "engine_shed" in RAILWAY_FACILITY_VALUES


def test_clean_tags_removes_missing_values_without_dropping_unknown_tags() -> None:
    tags = clean_tags({"railway": "rail", "unknown:tag": "value", "empty": ""})

    assert tags == {"railway": "rail", "unknown:tag": "value"}


def test_connected_multiline_can_be_coerced_to_linestring() -> None:
    geometry = MultiLineString([[(0, 0), (1, 1)], [(1, 1), (2, 2)]])

    line = coerce_linestring(geometry)

    assert isinstance(line, LineString)
    assert list(line.coords) == [(0.0, 0.0), (1.0, 1.0), (2.0, 2.0)]


def test_importer_writes_segments_and_stations_with_fake_session() -> None:
    session = FakeSession()
    importer = OSMImporter(session=session, batch_size=100)

    stats = importer.import_features(
        segment_features=[
            OSMFeature(
                osm_id=1,
                geometry=LineString([(37.0, 55.0), (37.1, 55.1)]),
                properties={"railway": "rail"},
            )
        ],
        station_features=[
            OSMFeature(
                osm_id=2,
                geometry=Point(37.0, 55.0),
                properties={"railway": "station", "name": "Moscow"},
            )
        ],
    )

    assert stats.segments_created == 1
    assert stats.stations_created == 1
    assert stats.total_written == 2
    assert len(session.added) == 2
    assert session.commit_count == 1


def test_osmium_reader_streams_only_railway_features(tmp_path) -> None:
    pytest.importorskip("osmium")
    from app.osm.readers import OsmiumRailwayReader

    osm_path = tmp_path / "railway.osm"
    osm_path.write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.6" generator="test">
  <node id="1" lat="55.0" lon="37.0" />
  <node id="2" lat="55.1" lon="37.1" />
  <node id="3" lat="55.2" lon="37.2">
    <tag k="railway" v="station" />
    <tag k="name" v="Test Station" />
  </node>
  <way id="10">
    <nd ref="1" />
    <nd ref="2" />
    <tag k="railway" v="rail" />
    <tag k="name" v="Test Rail" />
    <tag k="maxspeed" v="80" />
  </way>
  <way id="11">
    <nd ref="1" />
    <nd ref="2" />
    <tag k="railway" v="depot" />
    <tag k="name" v="Test Depot" />
  </way>
  <way id="12">
    <nd ref="1" />
    <nd ref="2" />
    <tag k="highway" v="service" />
  </way>
</osm>
""",
        encoding="utf-8",
    )
    segments = []
    stations = []

    OsmiumRailwayReader(osm_path, location_index="flex_mem").read(segments.append, stations.append)

    assert [feature.osm_id for feature in segments] == [10]
    assert {feature.osm_id for feature in stations} == {3, 11}
    assert segments[0].properties["maxspeed"] == "80"
