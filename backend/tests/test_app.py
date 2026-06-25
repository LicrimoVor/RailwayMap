import pytest

pytest.importorskip("fastapi")

from app.main import create_app


def test_health_route_is_registered() -> None:
    app = create_app()

    assert "/api/health" in app.openapi()["paths"]
