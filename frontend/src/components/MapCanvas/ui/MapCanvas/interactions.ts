import type { MapLayerMouseEvent } from "maplibre-gl";
import {
	findFeatureById,
	formatLength,
	selectedChunkPropertiesToFeatures,
} from "../../../../libs/railway";
import {
	RAILWAY_CHUNK_HIT_LAYER_ID,
	RAILWAY_HIT_LAYER_ID,
	STATION_LAYER_ID,
} from "../../../../map/layers";
import type {
	RailwayChunkFeature,
	RailwayFeature,
	StationFeature,
} from "../../../../types/railway";
import { emitViewportChange, toggleChunk } from "../../libs/mapHelpers";
import type { MapInteractionOptions } from "./types";
import { ensureRailwayLayers } from "./layers";
import {
	updateAdminSources,
	updateRailwaySources,
	updateSelectedChunksSource,
	updateSelectedRailwaySource,
	updateSelectionSources,
} from "./sources";
import { updateLayerVisibility } from "./visibility";

export function setupMapInteractions({
	map,
	popupRef,
	latestStateRef,
	onViewportChangeRef,
	callbacksRef,
}: MapInteractionOptions) {
	map.on("load", () => {
		const latest = latestStateRef.current;
		ensureRailwayLayers(map);
		updateRailwaySources(map, latest.data);
		updateAdminSources(map, latest.adminData);
		updateSelectionSources(
			map,
			latest.selectedFeature,
			latest.selectedChunkFeatures,
		);
		updateLayerVisibility(map, latest.visibleLayers);
		emitViewportChange(map, onViewportChangeRef.current);
	});

	map.on("moveend", () => {
		emitViewportChange(map, onViewportChangeRef.current);
	});

	map.on("click", (event) => {
		if (!latestStateRef.current.visibleLayers.railways) {
			return;
		}

		if (handleChunkClick(event, { map, latestStateRef, callbacksRef })) {
			return;
		}

		handleRailwayClick(event, { map, callbacksRef });
	});

	map.on("mousemove", RAILWAY_HIT_LAYER_ID, (event) => {
		if (!latestStateRef.current.visibleLayers.railways) {
			return;
		}

		map.getCanvas().style.cursor = "pointer";
		const feature = map.queryRenderedFeatures(event.point, {
			layers: [RAILWAY_HIT_LAYER_ID],
		})[0] as unknown as RailwayFeature | undefined;

		if (!feature || !popupRef.current) {
			return;
		}

		popupRef.current
			.setLngLat(event.lngLat)
			.setHTML(
				`<strong>${feature.properties.name ?? "Участок железной дороги"}</strong><br/>` +
					`Ветка: ${feature.properties.branch ?? "н/д"}<br/>` +
					`Длина: ${formatLength(feature.properties.length_m)}`,
			)
			.addTo(map);
	});

	map.on("mouseleave", RAILWAY_HIT_LAYER_ID, () => {
		map.getCanvas().style.cursor = "";
		popupRef.current?.remove();
	});

	map.on("mousemove", STATION_LAYER_ID, (event) => {
		if (!latestStateRef.current.visibleLayers.stations) {
			return;
		}

		map.getCanvas().style.cursor = "pointer";
		const feature = map.queryRenderedFeatures(event.point, {
			layers: [STATION_LAYER_ID],
		})[0] as unknown as StationFeature | undefined;

		if (!feature || !popupRef.current) {
			return;
		}

		popupRef.current
			.setLngLat(event.lngLat)
			.setHTML(`<strong>${escapeHtml(feature.properties.name)}</strong>`)
			.addTo(map);
	});

	map.on("mouseleave", STATION_LAYER_ID, () => {
		map.getCanvas().style.cursor = "";
		popupRef.current?.remove();
	});
}

function escapeHtml(value: string): string {
	return value.replace(
		/[&<>"']/g,
		(char) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
			})[char] ?? char,
	);
}

function handleChunkClick(
	event: MapLayerMouseEvent,
	{
		map,
		latestStateRef,
		callbacksRef,
	}: Pick<MapInteractionOptions, "map" | "latestStateRef" | "callbacksRef">,
): boolean {
	const chunkFeature = map.queryRenderedFeatures(event.point, {
		layers: [RAILWAY_CHUNK_HIT_LAYER_ID],
	})[0] as unknown as RailwayChunkFeature | undefined;

	if (!chunkFeature) {
		return false;
	}

	const parentSegment =
		latestStateRef.current.selectedFeature ??
		findFeatureById(
			latestStateRef.current.data.segments,
			chunkFeature.properties.segment_id,
		);
	const chunk = {
		...chunkFeature.properties,
		geometry: chunkFeature.geometry,
	};
	const nextChunks = toggleChunk(
		latestStateRef.current.selectedChunks,
		chunk,
	);

	updateSelectedChunksSource(
		map,
		selectedChunkPropertiesToFeatures(nextChunks),
	);
	callbacksRef.current.onSelectSegment(parentSegment?.properties ?? null);
	callbacksRef.current.onToggleChunk(chunk);
	return true;
}

function handleRailwayClick(
	event: MapLayerMouseEvent,
	{ map, callbacksRef }: Pick<MapInteractionOptions, "map" | "callbacksRef">,
) {
	const railwayFeature = map.queryRenderedFeatures(event.point, {
		layers: [RAILWAY_HIT_LAYER_ID],
	})[0] as unknown as RailwayFeature | undefined;

	updateSelectedRailwaySource(map, railwayFeature ?? null);
	if (!railwayFeature) {
		callbacksRef.current.onClearChunks();
		updateSelectedChunksSource(map, []);
	}
	callbacksRef.current.onSelectSegment(railwayFeature?.properties ?? null);
}
