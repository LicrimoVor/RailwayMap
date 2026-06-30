import type {
	ExpressionSpecification,
	LayerSpecification,
	Map as MapLibreMap,
} from "maplibre-gl";
import {
	DEFECT_LAYER_ID,
	DEFECT_SOURCE_ID,
	ELECTRIFICATION_LAYER_ID,
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
	STATION_LAYER_ID,
	STATION_SOURCE_ID,
} from "../../../../map/layers";
import { ensureMapSources } from "./sources";

const railwayLineWidth: ExpressionSpecification = [
	"interpolate",
	["linear"],
	["zoom"],
	3,
	1.4,
	8,
	4.2,
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
	8,
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
	12,
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
	15,
];
const hitLineWidth: ExpressionSpecification = [
	"interpolate",
	["linear"],
	["zoom"],
	3,
	14,
	8,
	22,
];
const circleRadius: ExpressionSpecification = [
	"interpolate",
	["linear"],
	["zoom"],
	0.1,
	1,
	5,
	5,
];

export const electrificationLineColor: ExpressionSpecification = [
	"match",
	["get", "electrified"],
	"contact_line",
	"#177a4b",
	"partial",
	"#bd5a18",
	"#c93535",
];

const layers: LayerSpecification[] = [
	{
		id: RAILWAY_LINE_LAYER_ID,
		type: "line",
		source: RAILWAY_SOURCE_ID,
		layout: { "line-cap": "round", "line-join": "round" },
		paint: {
			"line-color": "#5f6368",
			"line-width": railwayLineWidth,
			"line-opacity": 0.72,
		},
	},
	{
		id: ELECTRIFICATION_LAYER_ID,
		type: "line",
		source: RAILWAY_SOURCE_ID,
		layout: { "line-cap": "round", "line-join": "round" },
		paint: {
			"line-color": electrificationLineColor,
			"line-width": ["interpolate", ["linear"], ["zoom"], 3, 2.4, 8, 6],
			"line-opacity": 0.95,
		},
	},
	{
		id: RAILWAY_SELECTED_LAYER_ID,
		type: "line",
		source: SELECTED_SOURCE_ID,
		layout: { "line-cap": "round", "line-join": "round" },
		paint: {
			"line-color": "#101312",
			"line-width": ["interpolate", ["linear"], ["zoom"], 3, 3, 8, 7],
			"line-opacity": 0.95,
		},
	},
	{
		id: RAILWAY_CHUNK_GUIDE_CASING_LAYER_ID,
		type: "line",
		source: RAILWAY_CHUNK_SOURCE_ID,
		layout: { "line-cap": "round", "line-join": "round" },
		paint: {
			"line-color": "#ffffff",
			"line-width": chunkCasingWidth,
			"line-opacity": 0.86,
		},
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
			"line-dasharray": [2, 1],
		},
	},
	{
		id: RAILWAY_SELECTED_CHUNKS_LAYER_ID,
		type: "line",
		source: SELECTED_CHUNKS_SOURCE_ID,
		layout: { "line-cap": "round", "line-join": "round" },
		paint: {
			"line-color": "#0891b2",
			"line-width": selectedChunkWidth,
			"line-opacity": 0.96,
		},
	},
	{
		id: RAILWAY_CHUNK_HIT_LAYER_ID,
		type: "line",
		source: RAILWAY_CHUNK_SOURCE_ID,
		layout: { "line-cap": "round", "line-join": "round" },
		paint: {
			"line-color": "#000000",
			"line-width": hitLineWidth,
			"line-opacity": 0,
		},
	},
	{
		id: RAILWAY_HIT_LAYER_ID,
		type: "line",
		source: RAILWAY_SOURCE_ID,
		layout: { "line-cap": "round", "line-join": "round" },
		paint: {
			"line-color": "#000000",
			"line-width": hitLineWidth,
			"line-opacity": 0,
		},
	},
	{
		id: DEFECT_LAYER_ID,
		type: "circle",
		source: DEFECT_SOURCE_ID,
		paint: {
			"circle-color": "#c93535",
			"circle-stroke-color": "#ffffff",
			"circle-stroke-width": 1.5,
			"circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 5, 8, 10],
		},
	},
	{
		id: STATION_LAYER_ID,
		type: "circle",
		source: STATION_SOURCE_ID,
		paint: {
			"circle-color": "#ffffff",
			"circle-stroke-color": "#111827",
			"circle-stroke-width": 1.8,
			"circle-radius": circleRadius,
		},
	},
];

export function ensureRailwayLayers(map: MapLibreMap) {
	ensureMapSources(map);
	for (const layer of layers) {
		if (!map.getLayer(layer.id)) {
			map.addLayer(layer);
		}
	}
}
