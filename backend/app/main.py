from fastapi import FastAPI

from app.api.admin import router as admin_router
from app.api.health import router as health_router
from app.api.railway import router as railway_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Interactive Railway Map API",
        version="0.1.0",
        description="Backend API for a PostGIS-backed railway network map.",
    )
    app.include_router(health_router, prefix="/api")
    app.include_router(railway_router, prefix="/api")
    app.include_router(admin_router, prefix="/api")
    return app


app = create_app()
