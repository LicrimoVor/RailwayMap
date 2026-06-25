# Interactive Railway Map

Backend and frontend scaffold for an interactive railway map of Russia.

The project treats the railway network as a geographic graph. OpenStreetMap
data is stored separately from user events, defects, parameters, and other
domain layers so later OSM refreshes do not remove application data.

## Current scope

- FastAPI backend package.
- SQLAlchemy 2 models with GeoAlchemy2 geometry columns.
- Alembic configuration and an initial PostGIS migration.
- OSM railway/station importer with standalone utilities.
- React frontend with MapLibre GL, layer controls, segment details, and demo fallback data.
- Docker Compose services for PostGIS, Redis, backend, and frontend.
- Basic import and metadata tests.

Later stages should add API endpoints, linear referencing, events/defects
workflows, and vector tile optimization.

## Local commands

```powershell
cd backend
python -m pip install -e ".[test]"
alembic upgrade head
python -m pytest

cd ../frontend
npm install
npm run dev
```

To run services with Docker:

```powershell
docker compose up --build
```

The backend starts on `http://localhost:8000`; health check is
`http://localhost:8000/api/health`.

The frontend starts on `http://localhost:5173` in development or
`http://localhost:3000` through Docker Compose.
