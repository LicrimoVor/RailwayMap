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

After importing railway segments, build the coarse render sections, detailed
render sections, and selectable chunks:

```powershell
.\.venv\Scripts\python.exe utilities\rebuild_segment_sections_50km.py --section-length-m 50000
.\.venv\Scripts\python.exe utilities\rebuild_segment_chunks.py --chunk-length-m 100
```

The frontend renders 50 km sections first. Near the detail zoom threshold it
requests 50 km sections for the coarse map, and it requests 100 meter chunks
only after a user clicks a coarse section.

## Export railway sections to CSV

```powershell
.\.venv\Scripts\python.exe utilities\export_railway_sections_csv.py --output data\railway_sections.csv
```

Use `--kind 50km` or `--kind 100m` to export only one table. Use
`--no-geometry` when the CSV should stay compact.

## Remove duplicate railway rows

Check duplicate segments, chunks, and 50 km sections without
deleting data:

```powershell
.\.venv\Scripts\python.exe utilities\remove_duplicate_segments_chunks.py
```

Delete the reported duplicates:

```powershell
.\.venv\Scripts\python.exe utilities\remove_duplicate_segments_chunks.py --apply
```
