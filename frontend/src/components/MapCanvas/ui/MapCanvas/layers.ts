import type { ExpressionSpecification, LayerSpecification, Map as MapLibreMap } from "maplibre-gl";
import {
  DEFECT_LAYER_ID,
  DEFECT_SOURCE_ID,
  EVENT_LAYER_ID,
  EVENT_SOURCE_ID,
  RAILWAY_CHUNK_GUIDE_CASING_LAYER_ID,
  RAILWAY_CHUNK_GUIDE_LAYER_ID,
  RAILWAY_CHUNK_HIT_LAYER_ID,
  RAILWAY_CHUNK_SOURCE_ID,
  RAILWAY_HIT_LAYER_ID,
  RAILWAY_LINE_LAYER_ID,
  RAILWAY_SELECTED_CHUNKS_LAYER_ID,
  RAILWAY_SELECTED_LAYER_ID,
  RAILWAY_SOURCE_ID,
  SELECTED_CHUNKS_SOURCE_ID,
  SELECTED_SOURCE_ID,
  STATION_LABEL_LAYER_ID,
  STATION_LAYER_ID,
  STATION_SOURCE_ID
} from "../../../../map/layers";
import { ensureMapSources } from "./sources";

const railwayLineWidth: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  3,
  1.4,
  8,
  4.2
];
const chunkLineWidth: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  3,
  3,
  8,
  5,
  14,
  8
];
const chunkCasingWidth: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  3,
  5,
  8,
  8,
  14,
  12
];
const selectedChunkWidth: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  3,
  6,
  8,
  11,
  14,
  15
];
const hitLineWidth: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 3, 14, 8, 22];
const circleRadius: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 3, 4, 8, 9];

export const electrificationLineColor: ExpressionSpecification = [
  "match",
  ["get", "electrified"],
  "contact_line",
  "#177a4b",
  "partial",
  "#bd5a18",
  "#c93535"
];

const layers: LayerSpecification[] = [
  {
    id: RAILWAY_LINE_LAYER_ID,
    type: "line",
    source: RAILWAY_SOURCE_ID,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": electrificationLineColor, "line-width": railwayLineWidth, "line-opacity": 0.9 }
  },
  {
    id: RAILWAY_SELECTED_LAYER_ID,
    type: "line",
    source: SELECTED_SOURCE_ID,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#101312",
      "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3, 8, 7],
      "line-opacity": 0.95
    }
  },
  {
    id: RAILWAY_CHUNK_GUIDE_CASING_LAYER_ID,
    type: "line",
    source: RAILWAY_CHUNK_SOURCE_ID,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#ffffff", "line-width": chunkCasingWidth, "line-opacity": 0.86 }
  },
  {
    id: RAILWAY_CHUNK_GUIDE_LAYER_ID,
    type: "line",
    source: RAILWAY_CHUNK_SOURCE_ID,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#f97316",
      "line-width": chunkLineWidth,
      "line-opacity": 0.92,
      "line-dasharray": [2, 1]
    }
  },
  {
    id: RAILWAY_SELECTED_CHUNKS_LAYER_ID,
    type: "line",
    source: SELECTED_CHUNKS_SOURCE_ID,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#0891b2", "line-width": selectedChunkWidth, "line-opacity": 0.96 }
  },
  {
    id: RAILWAY_CHUNK_HIT_LAYER_ID,
    type: "line",
    source: RAILWAY_CHUNK_SOURCE_ID,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#000000", "line-width": hitLineWidth, "line-opacity": 0 }
  },
  {
    id: RAILWAY_HIT_LAYER_ID,
    type: "line",
    source: RAILWAY_SOURCE_ID,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#000000", "line-width": hitLineWidth, "line-opacity": 0 }
  },
  {
    id: EVENT_LAYER_ID,
    type: "line",
    source: EVENT_SOURCE_ID,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["coalesce", ["get", "event_type_color"], "#eab308"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 3, 4, 8, 9],
      "line-opacity": 0.78
    }
  },
  {
    id: DEFECT_LAYER_ID,
    type: "circle",
    source: DEFECT_SOURCE_ID,
    paint: {
      "circle-color": "#c93535",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.5,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 5, 8, 10]
    }
  },
  {
    id: STATION_LAYER_ID,
    type: "circle",
    source: STATION_SOURCE_ID,
    paint: {
      "circle-color": "#ffffff",
      "circle-stroke-color": "#111827",
      "circle-stroke-width": 1.8,
      "circle-radius": circleRadius
    }
  },
  {
    id: STATION_LABEL_LAYER_ID,
    type: "symbol",
    source: STATION_SOURCE_ID,
    minzoom: 4,
    layout: {
      "text-field": ["coalesce", ["get", "name"], ""],
      "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 8, 13],
      "text-offset": [0, 1.15],
      "text-anchor": "top",
      "text-allow-overlap": false,
      "text-optional": true
    },
    paint: { "text-color": "#111827", "text-halo-color": "#ffffff", "text-halo-width": 1.4 }
  }
];

export function ensureRailwayLayers(map: MapLibreMap) {
  ensureMapSources(map);
  for (const layer of layers) {
    if (!map.getLayer(layer.id)) {
      map.addLayer(layer);
    }
  }
}
