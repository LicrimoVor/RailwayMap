import pytest

pytest.importorskip("sqlalchemy")
pytest.importorskip("geoalchemy2")

from app.models import (
    Base,
    City,
    Defect,
    EventType,
    KilometerPoint,
    Layer,
    RailwayEvent,
    RailwaySegment,
    RailwaySegmentChunk,
    SegmentParameter,
    Station,
)


def test_stage1_tables_are_registered() -> None:
    expected_tables = {
        "railway_segments",
        "railway_segment_chunks",
        "stations",
        "cities",
        "kilometer_points",
        "event_types",
        "railway_events",
        "segment_parameters",
        "defects",
        "layers",
    }

    assert expected_tables == set(Base.metadata.tables)


def test_geometry_column_types_match_domain_model() -> None:
    assert RailwaySegment.__table__.c.geometry.type.geometry_type == "LINESTRING"
    assert RailwayEvent.__table__.c.geometry.type.geometry_type == "GEOMETRY"
    assert RailwaySegmentChunk.__table__.c.geometry.type.geometry_type == "LINESTRING"
    assert Station.__table__.c.geometry.type.geometry_type == "POINT"
    assert City.__table__.c.geometry.type.geometry_type == "POINT"
    assert KilometerPoint.__table__.c.geometry.type.geometry_type == "POINT"
    assert Defect.__table__.c.geometry.type.geometry_type == "POINT"


def test_osm_tags_and_types_are_preserved_on_imported_objects() -> None:
    assert "osm_type" in RailwaySegment.__table__.c
    assert "osm_tags" in RailwaySegment.__table__.c
    assert "osm_type" in Station.__table__.c
    assert "railway_type" in Station.__table__.c
    assert "osm_tags" in Station.__table__.c


def test_core_relationships_are_declared() -> None:
    assert RailwaySegment.kilometer_points.property.mapper.class_ is KilometerPoint
    assert RailwaySegment.events.property.mapper.class_ is RailwayEvent
    assert RailwaySegment.parameters.property.mapper.class_ is SegmentParameter
    assert RailwaySegment.defects.property.mapper.class_ is Defect
    assert RailwaySegment.chunks.property.mapper.class_ is RailwaySegmentChunk
    assert RailwayEvent.event_type.property.mapper.class_ is EventType


def test_reference_models_are_available() -> None:
    assert Layer.__tablename__ == "layers"
