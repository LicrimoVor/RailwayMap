import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPanel } from "../../../components/AdminPanel";
import { LayerPanel } from "../../../components/LayerPanel";
import { MapCanvas } from "../../../components/MapCanvas";
import {
	SegmentDetails,
	type SegmentDetailsTab,
} from "../../../components/SegmentDetails";
import { StatusBar } from "../../../components/StatusBar";
import { TopBar } from "../../../components/TopBar";
import { useRailwayData } from "../libs/useRailwayData";
import {
	buildRailwaySummary,
	findFeatureBySelection,
} from "../../../libs/railway";
import {
	emptyStationCollection,
	fetchSegmentChunksForSection,
	viewportRequestKey,
} from "../../../services/railwayApi";
import { useMapStore } from "../../../store/mapStore";
import type { AdminMapData } from "../../../types/admin";
import type {
	RailwayMapViewport,
	RailwaySegmentProperties,
} from "../../../types/railway";
import { MapLoadingOverlay } from "./MapLoadingOverlay";
import { useQueryMap } from "../libs/useQueryMap";

const emptyAdminData: AdminMapData = {
	events: { type: "FeatureCollection", features: [] },
	defects: { type: "FeatureCollection", features: [] },
};

export const MapPage = memo(() => {
	const viewportKeyRef = useRef<string | null>(null);
	const [viewport, setViewport] = useState<RailwayMapViewport | null>(null);
	const [isRoadRendering, setIsRoadRendering] = useState(false);
	const {
		railwayData,
		isFallback,
		isLoading,
		isRoadLoading,
		apiError,
		refetch,
	} = useRailwayData(viewport);
	const [leftPanelOpen, setLeftPanelOpen] = useState(false);
	const [rightPanelOpen, setRightPanelOpen] = useState(false);
	const [rightPanelActiveTab, setRightPanelActiveTab] =
		useState<SegmentDetailsTab>("details");
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
		useQueryMap(viewport);

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
		queryFn: ({ signal }) =>
			fetchSegmentChunksForSection(selectedSegment!, signal),
		enabled: selectedSectionCanLoadChunks,
		staleTime: 60_000,
	});
	const mapRailwayData = useMemo(
		() => ({
			...railwayData,
			stations: stationData
				? (stationData ?? emptyStationCollection)
				: emptyStationCollection,
			summary: buildRailwaySummary(
				railwayData.segments,
				stationData ?? emptyStationCollection,
			),
		}),
		[
			railwayData,
			stationData,
			chunkQuery.data,
			visibleLayers.railways,
			visibleLayers.stations,
		],
	);
	const selectedFeature = useMemo(
		() => findFeatureBySelection(mapRailwayData.segments, selectedSegment),
		[mapRailwayData.segments, selectedSegment],
	);
	const handleViewportChange = useCallback(
		(nextViewport: RailwayMapViewport) => {
			const nextKey = viewportRequestKey(nextViewport);
			if (nextKey === viewportKeyRef.current) {
				return;
			}

			viewportKeyRef.current = nextKey;
			setViewport(nextViewport);
		},
		[],
	);
	const handleSelectSegment = useCallback(
		(segment: RailwaySegmentProperties | null) => {
			setSelectedSegment(segment);
			if (segment) {
				if (!rightPanelOpen) {
					setRightPanelActiveTab("details");
				}
				setRightPanelOpen(true);
			}
		},
		[rightPanelOpen, setSelectedSegment],
	);
	const handleOpenRightPanel = useCallback(() => {
		setRightPanelActiveTab("details");
		setRightPanelOpen(true);
	}, []);
	const handleOpenElevationPanel = useCallback(() => {
		setRightPanelActiveTab("elevation");
		setRightPanelOpen(true);
	}, []);
	const handleRefresh = useCallback(() => {
		if (viewport) {
			const requests: Array<Promise<unknown>> = [
				refetch(),
				stationQuery.refetch(),
				defectQuery.refetch(),
			];

			if (selectedSectionCanLoadChunks) {
				requests.push(chunkQuery.refetch());
			}

			void Promise.all(requests);
		}
	}, [
		chunkQuery,
		defectQuery,
		refetch,
		selectedSectionCanLoadChunks,
		stationQuery,
		viewport,
	]);

	const stationLoading = stationQuery.isFetching;
	const defectLoading = defectQuery.isFetching;
	const roadLoading = isRoadLoading || isRoadRendering;
	const pageLoading = isLoading || isRoadRendering;
	const layerApiError = apiError ?? stationQuery.error ?? defectQuery.error;

	return (
		<main
			className="relative h-full w-full overflow-hidden"
			data-detail-panel-open={rightPanelOpen}
			data-layer-panel-open={leftPanelOpen}
		>
			<MapCanvas
				data={mapRailwayData}
				adminData={adminMapData}
				visibleLayers={visibleLayers}
				selectedSegment={selectedSegment}
				selectedChunks={selectedChunks}
				onViewportChange={handleViewportChange}
				onSelectSegment={handleSelectSegment}
				onToggleChunk={toggleSelectedChunk}
				onClearChunks={clearSelectedChunks}
				onRoadRenderStateChange={setIsRoadRendering}
			/>

			<MapLoadingOverlay
				roadLoading={roadLoading}
				stationLoading={stationLoading}
				defectLoading={defectLoading}
				chunkLoading={chunkQuery.isLoading}
			/>

			<div className="pointer-events-none absolute inset-x-3 top-3 z-10 md:inset-x-5">
				<TopBar
					isFallback={isFallback}
					isLoading={pageLoading}
					leftPanelOpen={leftPanelOpen}
					rightPanelOpen={rightPanelOpen}
					rightPanelActiveTab={rightPanelActiveTab}
					onOpenLeftPanel={() => setLeftPanelOpen(true)}
					onOpenRightPanel={handleOpenRightPanel}
					onOpenElevationPanel={handleOpenElevationPanel}
					onRefresh={handleRefresh}
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
						selectedFeature={selectedFeature}
						selectedChunks={selectedChunks}
						activeTab={rightPanelActiveTab}
						onTabChange={setRightPanelActiveTab}
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
