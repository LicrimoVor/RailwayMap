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

## Build

```powershell
npm run build
```

The map requests `/api/segments` and `/api/stations`. Until those backend
endpoints exist, the UI falls back to demo railway data so map interactions
remain usable.
