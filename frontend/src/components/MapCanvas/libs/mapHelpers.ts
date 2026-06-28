import type { Map as MapLibreMap } from "maplibre-gl";
import type { RailwayChunkProperties, RailwayMapViewport } from "../../../types/railway";

export const emptyFeatureCollection = {
  type: "FeatureCollection",
  features: []
} satisfies GeoJSON.FeatureCollection;

export function toggleChunk(
  chunks: RailwayChunkProperties[],
  chunk: RailwayChunkProperties
): RailwayChunkProperties[] {
  const exists = chunks.some((item) => String(item.id) === String(chunk.id));
  return exists
    ? chunks.filter((item) => String(item.id) !== String(chunk.id))
    : [...chunks, chunk];
}

export function emitViewportChange(
  map: MapLibreMap,
  onViewportChange: (viewport: RailwayMapViewport) => void
) {
  const bounds = map.getBounds();
  onViewportChange({
    minLon: bounds.getWest(),
    minLat: bounds.getSouth(),
    maxLon: bounds.getEast(),
    maxLat: bounds.getNorth(),
    zoom: map.getZoom()
  });
}
