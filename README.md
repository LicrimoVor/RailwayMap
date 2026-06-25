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
- REST API for railway map data, events, defects, layers, and segment parameters.
- React frontend with MapLibre GL, layer controls, segment details, admin forms, and demo fallback data.
- Docker Compose services for PostGIS, Redis, backend, and frontend.
- Basic import and metadata tests.

Later stages should add linear referencing, vector tiles, advanced editing, and
performance optimization.

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

The frontend checks whether `tile.openstreetmap.org` is reachable. If it is,
MapLibre uses the OSM raster basemap; otherwise it falls back to a local
schematic Russia basemap. Railway, station, event, and defect data is loaded
from the local backend API.

## API

Core map endpoints:

- `GET /api/segments`
- `GET /api/segments/{segment_id}`
- `GET /api/stations`
- `GET /api/events`
- `GET /api/defects`

Admin write endpoints:

- `POST /api/events`
- `POST /api/defects`
- `POST /api/segment-parameters`
- `POST /api/event-types`
- `POST /api/layers`

The frontend admin panel uses the selected railway segment as the current
editable section. Events and defects are linked to that segment and rendered on
the map.

## Fine-Grained Selection

Railway ways can be split into selectable chunks, 100 meters by default:

```powershell
cd backend
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe utilities\rebuild_segment_chunks.py --chunk-length-m 100
```

The frontend loads `/api/segment-chunks` and lets users build an arbitrary
selection by clicking multiple highlighted chunks, even when they belong to
different source OSM segments. New events use the selected chunk geometry.
