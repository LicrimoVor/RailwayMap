# Utilities

Command-line utilities for data operations that should run outside the FastAPI
server process.

## Import OSM railway data

Install import dependencies first:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -e ".[import,test]"
```

Run migrations and import a local PBF extract:

```powershell
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe utilities\import_osm.py data\russia-latest.osm.pbf
```

The importer uses the streaming `osmium` reader by default. This avoids loading
the full PBF into pandas/geopandas dataframes and is the preferred mode for
large regional or country extracts.

The importer writes only OSM-derived map tables: `railway_segments` and
`stations`. It preserves all source tags in `osm_tags`. Application data such as
events, defects, parameters, and custom layers is not deleted during import.

Useful flags:

```powershell
.\.venv\Scripts\python.exe utilities\import_osm.py data\russia-latest.osm.pbf --dry-run
.\.venv\Scripts\python.exe utilities\import_osm.py data\russia-latest.osm.pbf --batch-size 500
.\.venv\Scripts\python.exe utilities\import_osm.py data\russia-latest.osm.pbf --reader pyrosm
```

## Rebuild selectable railway chunks

After importing railway segments, build 100 meter chunks for fine-grained map
selection:

```powershell
.\.venv\Scripts\python.exe utilities\rebuild_segment_chunks.py --chunk-length-m 100
```
