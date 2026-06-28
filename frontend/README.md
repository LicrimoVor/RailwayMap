# Frontend

React, TypeScript, Vite, MapLibre GL, React Query, Zustand, Tailwind, Axios,
and Recharts frontend for the railway map.

## Development

```powershell
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies `/api` to
`http://localhost:8000`.

On startup the map probes `https://tile.openstreetmap.org/0/0/0.png` with a
short timeout. If the tile loads, MapLibre uses OSM raster tiles. If the probe
fails or the browser is offline, it falls back to a local schematic Russia
background from inline GeoJSON.

## Build

```powershell
npm run build
```

The map requests `/api/segments`, `/api/stations`, `/api/events`, and
`/api/defects`. Until backend data exists, the UI falls back to demo railway
segments so map interactions remain usable.

Railway and station data is loaded page by page, so large imports are no longer
truncated to the first API page.

The map renders `/api/segment-sections-50km` for the coarse railway layer. It
loads 100 meter chunks from `/api/segment-chunks` only after a user clicks a
coarse section. The OSM importer writes both derived tables immediately; rebuild
them manually only when needed:

```powershell
cd ../backend
.\.venv\Scripts\python.exe utilities\rebuild_segment_sections_50km.py --section-length-m 50000
.\.venv\Scripts\python.exe utilities\rebuild_segment_chunks.py --chunk-length-m 100
```

## Admin Panel

Click a railway line to select a segment. The right-side admin panel can create:

- events with type, color, severity, start/end km and pk;
- defects with type, severity, km and pk;
- arbitrary segment parameters.

New events and defects are stored through the backend API and then reloaded onto
the map layers.

Click multiple 100 meter railway chunks to create an arbitrary event geometry.
Selected chunks are highlighted in blue and may cross source OSM segment
boundaries.
