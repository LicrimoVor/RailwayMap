import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import {
  DEFECT_SOURCE_ID,
  EVENT_SOURCE_ID,
  RAILWAY_CHUNK_SOURCE_ID,
  RAILWAY_SOURCE_ID,
  SELECTED_CHUNKS_SOURCE_ID,
  SELECTED_SOURCE_ID,
  STATION_SOURCE_ID
} from "../../../../map/layers";
import type { AdminMapData } from "../../../../types/admin";
import type {
  RailwayChunkFeature,
  RailwayData,
  RailwayFeature
} from "../../../../types/railway";
import { emptyFeatureCollection } from "../../libs/mapHelpers";

const sourceIds = [
  RAILWAY_SOURCE_ID,
  RAILWAY_CHUNK_SOURCE_ID,
  STATION_SOURCE_ID,
  SELECTED_SOURCE_ID,
  SELECTED_CHUNKS_SOURCE_ID,
  EVENT_SOURCE_ID,
  DEFECT_SOURCE_ID
] as const;

export function ensureMapSources(map: MapLibreMap) {
  for (const id of sourceIds) {
    if (!map.getSource(id)) {
      map.addSource(id, { type: "geojson", data: emptyFeatureCollection });
    }
  }
}

export function updateRailwaySources(map: MapLibreMap, data: RailwayData) {
  updateBaseRailwaySource(map, data);
  updateChunkSource(map, data);
}

export function updateBaseRailwaySource(map: MapLibreMap, data: RailwayData) {
  setGeoJsonData(map, RAILWAY_SOURCE_ID, data.segments);
  setGeoJsonData(map, STATION_SOURCE_ID, data.stations);
}

export function updateChunkSource(map: MapLibreMap, data: RailwayData) {
  setGeoJsonData(map, RAILWAY_CHUNK_SOURCE_ID, data.chunks);
}

export function updateAdminSources(map: MapLibreMap, adminData: AdminMapData) {
  setGeoJsonData(map, EVENT_SOURCE_ID, adminData.events);
  setGeoJsonData(map, DEFECT_SOURCE_ID, adminData.defects);
}

export function updateSelectionSources(
  map: MapLibreMap,
  selectedFeature: RailwayFeature | null,
  selectedChunkFeatures: RailwayChunkFeature[]
) {
  updateSelectedRailwaySource(map, selectedFeature);
  updateSelectedChunksSource(map, selectedChunkFeatures);
}

export function updateSelectedRailwaySource(
  map: MapLibreMap,
  selectedFeature: RailwayFeature | null
) {
  setGeoJsonData(
    map,
    SELECTED_SOURCE_ID,
    selectedFeature
      ? { type: "FeatureCollection", features: [selectedFeature] }
      : emptyFeatureCollection
  );
}

export function updateSelectedChunksSource(
  map: MapLibreMap,
  selectedChunkFeatures: RailwayChunkFeature[]
) {
  setGeoJsonData(map, SELECTED_CHUNKS_SOURCE_ID, {
    type: "FeatureCollection",
    features: selectedChunkFeatures
  });
}

function setGeoJsonData(map: MapLibreMap, sourceId: string, data: GeoJSON.FeatureCollection) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  source?.setData(data);
}
