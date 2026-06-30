import { memo, useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPanel } from "../../../components/AdminPanel";
import { LayerPanel } from "../../../components/LayerPanel";
import { MapCanvas } from "../../../components/MapCanvas";
import { SegmentDetails } from "../../../components/SegmentDetails";
import { StatusBar } from "../../../components/StatusBar";
import { TopBar } from "../../../components/TopBar";
import { useRailwayData } from "../libs/useRailwayData";
import { buildRailwaySummary } from "../../../libs/railway";
import {
	emptyStationCollection,
	fetchSegmentChunksForSection,
} from "../../../services/railwayApi";
import { useMapStore } from "../../../store/mapStore";
import type { AdminMapData } from "../../../types/admin";
import type {
	RailwayChunkFeatureCollection,
	RailwayFeatureCollection,
} from "../../../types/railway";
import { MapLoadingOverlay } from "./MapLoadingOverlay";
import { useQueryMap } from "../libs/useQueryMap";

const emptyAdminData: AdminMapData = {
	events: { type: "FeatureCollection", features: [] },
	defects: { type: "FeatureCollection", features: [] },
};
const emptyRailwaySegments: RailwayFeatureCollection = {
	type: "FeatureCollection",
	features: [],
};
const emptyRailwayChunks: RailwayChunkFeatureCollection = {
	type: "FeatureCollection",
	features: [],
};

export const MapPage = memo(() => {
	const {
		railwayData,
		isFallback,
		isLoading,
		isRoadLoading,
		apiError,
		refetch,
	} = useRailwayData();
	const [leftPanelOpen, setLeftPanelOpen] = useState(false);
	const [rightPanelOpen, setRightPanelOpen] = useState(false);
	const {
		clearSelectedChunks,
		visibleLayers,
		selectedSegment,
		selectedChunks,
		toggleLayer,
		toggleSelectedChunk,
		clearSelection,
		setSelectedSegment,
	} = useMapStore();
	const { stationData, defectData, defectQuery, stationQuery } =
		useQueryMap();

	const adminMapData = useMemo<AdminMapData>(
		() => ({
			events: emptyAdminData.events,
			defects: visibleLayers.defects
				? (defectData ?? emptyAdminData.defects)
				: emptyAdminData.defects,
		}),
		[defectData, visibleLayers.defects],
	);
	const selectedSectionCanLoadChunks =
		selectedSegment?.section_start_offset_m !== undefined &&
		selectedSegment?.section_start_offset_m !== null &&
		selectedSegment?.section_end_offset_m !== undefined &&
		selectedSegment?.section_end_offset_m !== null;
	const chunkQuery = useQuery({
		queryKey: [
			"segment-chunks",
			selectedSegment?.id,
			selectedSegment?.section_start_offset_m,
			selectedSegment?.section_end_offset_m,
		],
		queryFn: () => fetchSegmentChunksForSection(selectedSegment!),
		enabled: selectedSectionCanLoadChunks,
		staleTime: 60_000,
	});
	const mapRailwayData = useMemo(
		() => ({
			...railwayData,
			segments: visibleLayers.railways
				? railwayData.segments
				: emptyRailwaySegments,
			stations: visibleLayers.stations
				? (stationData ?? emptyStationCollection)
				: emptyStationCollection,
			summary: buildRailwaySummary(
				railwayData.segments,
				stationData ?? emptyStationCollection,
			),
			chunks: visibleLayers.railways
				? (chunkQuery.data ?? emptyRailwayChunks)
				: emptyRailwayChunks,
		}),
		[
			railwayData,
			stationData,
			chunkQuery.data,
			visibleLayers.railways,
			visibleLayers.stations,
		],
	);
	const handleViewportChange = useCallback(() => undefined, []);

	const stationLoading =
		visibleLayers.stations &&
		stationData === null &&
		stationQuery.isLoading;
	const defectLoading =
		visibleLayers.defects && defectData === null && defectQuery.isLoading;
	const layerApiError = apiError ?? stationQuery.error ?? defectQuery.error;

	return (
		<main className="relative h-full w-full overflow-hidden">
			<MapCanvas
				data={mapRailwayData}
				adminData={adminMapData}
				visibleLayers={visibleLayers}
				selectedSegment={selectedSegment}
				selectedChunks={selectedChunks}
				onViewportChange={handleViewportChange}
				onSelectSegment={(segment) => {
					setSelectedSegment(segment);
					if (segment) {
						setRightPanelOpen(true);
					}
				}}
				onToggleChunk={toggleSelectedChunk}
				onClearChunks={clearSelectedChunks}
			/>

			<MapLoadingOverlay
				roadLoading={isRoadLoading}
				stationLoading={stationLoading}
				defectLoading={defectLoading}
				chunkLoading={chunkQuery.isLoading}
			/>

			<div className="pointer-events-none absolute inset-x-3 top-3 z-10 md:inset-x-5">
				<TopBar
					isFallback={isFallback}
					isLoading={isLoading}
					leftPanelOpen={leftPanelOpen}
					rightPanelOpen={rightPanelOpen}
					onOpenLeftPanel={() => setLeftPanelOpen(true)}
					onOpenRightPanel={() => setRightPanelOpen(true)}
					onRefresh={() => void refetch()}
				/>
			</div>

			{leftPanelOpen && (
				<div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 grid gap-3 md:bottom-5 md:left-5 md:right-auto md:top-24 md:w-80 md:auto-rows-min">
					<LayerPanel
						visibleLayers={visibleLayers}
						onToggleLayer={toggleLayer}
						onCollapse={() => setLeftPanelOpen(false)}
						summary={mapRailwayData.summary}
					/>
					<StatusBar isFallback={isFallback} error={layerApiError} />
				</div>
			)}

			{rightPanelOpen && (
				<div className="pointer-events-none absolute left-3 right-3 top-24 z-10 grid max-h-[calc(100%-7rem)] gap-3 overflow-y-auto md:bottom-5 md:left-auto md:right-5 md:w-96">
					<SegmentDetails
						segment={selectedSegment}
						selectedChunks={selectedChunks}
						onCollapse={() => setRightPanelOpen(false)}
						onClose={clearSelection}
					/>
					<AdminPanel
						segment={selectedSegment}
						selectedChunks={selectedChunks}
					/>
				</div>
			)}
		</main>
	);
});
