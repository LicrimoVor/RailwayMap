import pytest

pytest.importorskip("fastapi")

from app.main import create_app


def test_health_route_is_registered() -> None:
    app = create_app()

    assert "/api/health" in app.openapi()["paths"]


def test_stage_api_routes_are_registered() -> None:
    app = create_app()
    paths = app.openapi()["paths"]

    expected_paths = {
        "/api/segments",
        "/api/segments/{segment_id}",
        "/api/segment-chunks",
        "/api/segment-chunks/rebuild",
        "/api/segment-sections-10km",
        "/api/segment-sections-10km/rebuild",
        "/api/stations",
        "/api/events",
        "/api/defects",
        "/api/layers",
        "/api/event-types",
        "/api/segment-parameters",
    }

    assert expected_paths <= set(paths)
