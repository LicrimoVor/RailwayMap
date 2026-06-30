import type { Map as MapLibreMap } from "maplibre-gl";
import type { LayerKey } from "../../../../store/mapStore";
import {
	DEFECT_LAYER_ID,
	ELECTRIFICATION_LAYER_ID,
	RAILWAY_CHUNK_GUIDE_CASING_LAYER_ID,
	RAILWAY_CHUNK_GUIDE_LAYER_ID,
	RAILWAY_CHUNK_HIT_LAYER_ID,
	RAILWAY_HIT_LAYER_ID,
	RAILWAY_LINE_LAYER_ID,
	RAILWAY_SELECTED_CHUNKS_LAYER_ID,
	RAILWAY_SELECTED_LAYER_ID,
	STATION_LABEL_LAYER_ID,
	STATION_LAYER_ID,
} from "../../../../map/layers";

const railwayLayers = [
	RAILWAY_LINE_LAYER_ID,
	RAILWAY_HIT_LAYER_ID,
	RAILWAY_CHUNK_GUIDE_CASING_LAYER_ID,
	RAILWAY_CHUNK_GUIDE_LAYER_ID,
	RAILWAY_CHUNK_HIT_LAYER_ID,
	RAILWAY_SELECTED_LAYER_ID,
	RAILWAY_SELECTED_CHUNKS_LAYER_ID,
];

export function updateLayerVisibility(
	map: MapLibreMap,
	visibleLayers: Record<LayerKey, boolean>,
) {
	setLayersVisibility(map, railwayLayers, visibleLayers.railways);
	setLayerVisibility(
		map,
		ELECTRIFICATION_LAYER_ID,
		visibleLayers.railways && visibleLayers.electrification,
	);
	setLayerVisibility(map, STATION_LAYER_ID, visibleLayers.stations);
	setLayerVisibility(map, DEFECT_LAYER_ID, visibleLayers.defects);
}

function setLayersVisibility(
	map: MapLibreMap,
	layerIds: string[],
	visible: boolean,
) {
	for (const layerId of layerIds) {
		setLayerVisibility(map, layerId, visible);
	}
}

function setLayerVisibility(
	map: MapLibreMap,
	layerId: string,
	visible: boolean,
) {
	if (map.getLayer(layerId)) {
		map.setLayoutProperty(
			layerId,
			"visibility",
			visible ? "visible" : "none",
		);
	}
}
