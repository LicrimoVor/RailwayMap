import { memo, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { resolveBaseMapStyle } from "../../../../map/baseStyle";
import {
	selectedChunkPropertiesToFeatures,
	findFeatureBySelection,
} from "../../../../libs/railway";
import type { MapCanvasProps } from "../../model/types";
import { setupMapInteractions } from "./interactions";
import { ensureRailwayLayers } from "./layers";
import { addMapPluginControls } from "./plugins";
import {
	updateAdminSources,
	updateRailwaySources,
	updateSelectionSources,
} from "./sources";
import type { MapStateSnapshot } from "./types";
import { updateLayerVisibility } from "./visibility";

export const MapCanvas = memo(
	({
		data,
		adminData,
		visibleLayers,
		selectedSegment,
		selectedChunks,
		onViewportChange,
		onSelectSegment,
		onToggleChunk,
		onClearChunks,
		onRoadRenderStateChange,
	}: MapCanvasProps) => {
		const containerRef = useRef<HTMLDivElement | null>(null);
		const mapRef = useRef<MapLibreMap | null>(null);
		const popupRef = useRef<maplibregl.Popup | null>(null);
		const onViewportChangeRef = useRef(onViewportChange);
		const onRoadRenderStateChangeRef = useRef(onRoadRenderStateChange);
		const roadRenderSnapshotRef = useRef<RoadRenderSnapshot | null>(null);
		const roadRenderGenerationRef = useRef(0);
		const roadRenderTimeoutRef = useRef<number | null>(null);
		const callbacksRef = useRef({
			onSelectSegment,
			onToggleChunk,
			onClearChunks,
		});

		const selectedFeature = useMemo(
			() => findFeatureBySelection(data.segments, selectedSegment),
			[data.segments, selectedSegment],
		);
		const selectedChunkFeatures = useMemo(
			() => selectedChunkPropertiesToFeatures(selectedChunks),
			[selectedChunks],
		);
		const latestStateRef = useRef<MapStateSnapshot>({
			data,
			adminData,
			selectedFeature,
			selectedChunkFeatures,
			selectedChunks,
			visibleLayers,
		});

		useEffect(() => {
			latestStateRef.current = {
				data,
				adminData,
				selectedFeature,
				selectedChunkFeatures,
				selectedChunks,
				visibleLayers,
			};
		}, [
			data,
			adminData,
			selectedFeature,
			selectedChunkFeatures,
			selectedChunks,
			visibleLayers,
		]);

		useEffect(() => {
			onViewportChangeRef.current = onViewportChange;
		}, [onViewportChange]);

		useEffect(() => {
			onRoadRenderStateChangeRef.current = onRoadRenderStateChange;
		}, [onRoadRenderStateChange]);

		useEffect(() => {
			callbacksRef.current = {
				onSelectSegment,
				onToggleChunk,
				onClearChunks,
			};
		}, [onSelectSegment, onToggleChunk, onClearChunks]);

		useEffect(() => {
			if (!containerRef.current || mapRef.current) {
				return;
			}

			let disposed = false;

			void resolveBaseMapStyle().then((style) => {
				if (disposed || !containerRef.current || mapRef.current) {
					return;
				}

				const map = new maplibregl.Map({
					container: containerRef.current,
					style,
					center: [92, 58],
					zoom: 3.1,
					minZoom: 2,
					maxZoom: 18,
					renderWorldCopies: false,
					maxBounds: [
						[18, 40],
						[180, 83],
					],
				});

				map.addControl(
					new maplibregl.NavigationControl({ visualizePitch: true }),
					"bottom-right",
				);
				popupRef.current = new maplibregl.Popup({
					closeButton: false,
					closeOnClick: false,
				});
				mapRef.current = map;

				map.on("load", () => {
					startRoadRenderTracking({
						map,
						state: latestStateRef.current,
						force: true,
						snapshotRef: roadRenderSnapshotRef,
						generationRef: roadRenderGenerationRef,
						timeoutRef: roadRenderTimeoutRef,
						onRenderingChangeRef: onRoadRenderStateChangeRef,
					});
				});

				setupMapInteractions({
					map,
					popupRef,
					latestStateRef,
					onViewportChangeRef,
					callbacksRef,
				});
				map.once("load", () => {
					void addMapPluginControls(map);
				});
			});

			return () => {
				disposed = true;
				clearRoadRenderTimeout(roadRenderTimeoutRef);
				onRoadRenderStateChangeRef.current(false);
				popupRef.current?.remove();
				mapRef.current?.remove();
				mapRef.current = null;
			};
		}, []);

		useEffect(() => {
			const map = mapRef.current;
			if (!map) {
				return;
			}

			const latestState = latestStateRef.current;
			if (map.isStyleLoaded()) {
				startRoadRenderTracking({
					map,
					state: latestState,
					force: false,
					snapshotRef: roadRenderSnapshotRef,
					generationRef: roadRenderGenerationRef,
					timeoutRef: roadRenderTimeoutRef,
					onRenderingChangeRef: onRoadRenderStateChangeRef,
				});
			}

			syncMapState(map, latestState);
		}, [
			data,
			adminData,
			selectedFeature,
			selectedChunkFeatures,
			visibleLayers,
		]);

		return <div ref={containerRef} className="absolute inset-0" />;
	},
);

type RoadRenderSnapshot = {
	segments: MapStateSnapshot["data"]["segments"];
	featureCount: number;
	railwaysVisible: boolean;
	electrificationVisible: boolean;
};

type RoadRenderTrackingOptions = {
	map: MapLibreMap;
	state: MapStateSnapshot;
	force: boolean;
	snapshotRef: MutableRefObject<RoadRenderSnapshot | null>;
	generationRef: MutableRefObject<number>;
	timeoutRef: MutableRefObject<number | null>;
	onRenderingChangeRef: MutableRefObject<(isRendering: boolean) => void>;
};

function startRoadRenderTracking({
	map,
	state,
	force,
	snapshotRef,
	generationRef,
	timeoutRef,
	onRenderingChangeRef,
}: RoadRenderTrackingOptions) {
	const nextSnapshot: RoadRenderSnapshot = {
		segments: state.data.segments,
		featureCount: state.data.segments.features.length,
		railwaysVisible: state.visibleLayers.railways,
		electrificationVisible: state.visibleLayers.electrification,
	};
	const previousSnapshot = snapshotRef.current;
	const changed =
		force ||
		!previousSnapshot ||
		previousSnapshot.segments !== nextSnapshot.segments ||
		previousSnapshot.featureCount !== nextSnapshot.featureCount ||
		previousSnapshot.railwaysVisible !== nextSnapshot.railwaysVisible ||
		previousSnapshot.electrificationVisible !==
			nextSnapshot.electrificationVisible;

	if (!changed) {
		return;
	}

	snapshotRef.current = nextSnapshot;

	if (!nextSnapshot.railwaysVisible || nextSnapshot.featureCount === 0) {
		clearRoadRenderTimeout(timeoutRef);
		generationRef.current += 1;
		onRenderingChangeRef.current(false);
		return;
	}

	const generation = generationRef.current + 1;
	generationRef.current = generation;
	clearRoadRenderTimeout(timeoutRef);
	onRenderingChangeRef.current(true);

	const finishRendering = () => {
		if (generationRef.current !== generation) {
			return;
		}

		clearRoadRenderTimeout(timeoutRef);
		onRenderingChangeRef.current(false);
	};

	map.once("idle", finishRendering);
	timeoutRef.current = window.setTimeout(finishRendering, 8_000);
}

function clearRoadRenderTimeout(
	timeoutRef: MutableRefObject<number | null>,
) {
	if (timeoutRef.current !== null) {
		window.clearTimeout(timeoutRef.current);
		timeoutRef.current = null;
	}
}

function syncMapState(map: MapLibreMap, state: MapStateSnapshot) {
	const ready = readyMap(map);
	if (!ready) {
		return;
	}

	updateRailwaySources(ready, state.data);
	updateAdminSources(ready, state.adminData);
	updateSelectionSources(
		ready,
		state.selectedFeature,
		state.selectedChunkFeatures,
	);
	updateLayerVisibility(ready, state.visibleLayers);
}

function readyMap(map: MapLibreMap | null): MapLibreMap | null {
	if (!map || !map.isStyleLoaded()) {
		return null;
	}
	ensureRailwayLayers(map);
	return map;
}
