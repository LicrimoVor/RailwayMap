# Backend

FastAPI backend for the interactive railway map.

## Structure

- `app/api` - HTTP routers.
- `app/core` - configuration and database setup.
- `app/models` - SQLAlchemy and GeoAlchemy2 database models.
- `app/schemas` - Pydantic v2 schemas.
- `app/crud`, `app/repositories`, `app/services` - application data access and domain logic for later stages.
- `app/osm` - OSM import code for stage 2.
- `app/gis` - GIS and linear referencing services for later stages.
- `app/events` - event and defect workflows for later stages.
- `app/tasks` - Celery tasks for background processing.
- `alembic` - database migrations.
- `tests` - pytest tests.

## Development

```powershell
python -m pip install -e ".[test]"
alembic upgrade head
uvicorn app.main:app --reload
python -m pytest
```

## OSM Import

Stage 2 importer code lives in `app/osm`. Standalone utility scripts live in
`utilities`.

Install import dependencies when you need to read `.osm.pbf` files:

```powershell
python -m pip install -e ".[import,test]"
```

Run the importer after migrations:

```powershell
alembic upgrade head
python utilities/import_osm.py data/russia-latest.osm.pbf
```

The default reader is `osmium`, which streams the PBF and uses a file-backed
node location index to avoid the `pyrosm` dataframe memory spike on large
extracts. The importer keeps all OSM tags in `osm_tags` while also mapping core
railway fields into typed columns.

Imported OSM objects:

- railway ways: `rail`, `narrow_gauge`, `light_rail`, `subway`, `tram`,
  `preserved`, `disused`, `abandoned`, `construction`, and related line types;
- facilities: `station`, `halt`, `junction`, `depot`, `workshop`,
  `engine_shed`, `roundhouse`, `service_station`, and `yard`.

Use `--dry-run` to validate parsing and database writes without committing.
Use `--reader pyrosm` only for small extracts or compatibility checks.

## API

Map reads:

- `GET /api/segments`
- `GET /api/segments/{segment_id}`
- `GET /api/segment-sections-50km`
- `GET /api/stations`
- `GET /api/events`
- `GET /api/defects`

Admin writes:

- `POST /api/events`
- `POST /api/defects`
- `POST /api/segment-parameters`
- `POST /api/event-types`
- `POST /api/layers`

`/api/segments`, `/api/stations`, `/api/events`, and `/api/defects` return
GeoJSON feature collections for direct use by MapLibre.
Map endpoints accept `min_lon`, `min_lat`, `max_lon`, and `max_lat` viewport
filters. `GET /api/segment-sections-50km` returns the coarse 50 km render layer
for the farthest zoom levels.

Fine-grained selection:

- `GET /api/segment-chunks`
- `POST /api/segment-chunks/rebuild`
- `GET /api/segment-sections-50km`
- `POST /api/segment-sections-50km/rebuild`

The OSM importer writes 50 km render sections and 100 meter chunks immediately.
Use rebuild utilities only when you need to regenerate derived rows:

```powershell
python utilities/rebuild_segment_sections_50km.py --section-length-m 50000
python utilities/rebuild_segment_chunks.py --chunk-length-m 100
python utilities/remove_duplicate_segments_chunks.py
```

Export railway sections to CSV:

```powershell
python utilities/export_railway_sections_csv.py --output data/railway_sections.csv
```
