import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPanel } from "../components/AdminPanel";
import { LayerPanel } from "../components/LayerPanel";
import { MapCanvas } from "../components/MapCanvas";
import { SegmentDetails } from "../components/SegmentDetails";
import { StatusBar } from "../components/StatusBar";
import { TopBar } from "../components/TopBar";
import { useRailwayData } from "../hooks/useRailwayData";
import { fetchDefectsForViewport, fetchEventsForViewport } from "../services/adminApi";
import { fetchSegmentChunksForSection } from "../services/railwayApi";
import { useMapStore } from "../store/mapStore";
import type { AdminMapData } from "../types/admin";
import type { RailwayMapViewport } from "../types/railway";

const emptyAdminData: AdminMapData = {
  events: { type: "FeatureCollection", features: [] },
  defects: { type: "FeatureCollection", features: [] }
};

export function MapPage() {
  const [viewport, setViewport] = useState<RailwayMapViewport | null>(null);
  const visibleLayers = useMapStore((state) => state.visibleLayers);
  const { railwayData, isFallback, isLoading, isRoadLoading, isStationLoading, apiError, refetch } =
    useRailwayData(visibleLayers.stations);
  const selectedSegment = useMapStore((state) => state.selectedSegment);
  const selectedChunks = useMapStore((state) => state.selectedChunks);
  const leftPanelOpen = useMapStore((state) => state.leftPanelOpen);
  const rightPanelOpen = useMapStore((state) => state.rightPanelOpen);
  const toggleLayer = useMapStore((state) => state.toggleLayer);
  const toggleSelectedChunk = useMapStore((state) => state.toggleSelectedChunk);
  const clearSelectedChunks = useMapStore((state) => state.clearSelectedChunks);
  const clearSelection = useMapStore((state) => state.clearSelection);
  const setLeftPanelOpen = useMapStore((state) => state.setLeftPanelOpen);
  const setRightPanelOpen = useMapStore((state) => state.setRightPanelOpen);
  const setSelectedSegment = useMapStore((state) => state.setSelectedSegment);
  const viewportQueryKey = [
    viewport?.minLon.toFixed(2),
    viewport?.minLat.toFixed(2),
    viewport?.maxLon.toFixed(2),
    viewport?.maxLat.toFixed(2)
  ];
  const eventQuery = useQuery({
    queryKey: ["admin-map-events", ...viewportQueryKey],
    queryFn: () => fetchEventsForViewport(viewport!),
    enabled: viewport !== null && visibleLayers.events,
    staleTime: 30_000,
    placeholderData: (previousData) => previousData
  });
  const defectQuery = useQuery({
    queryKey: ["admin-map-defects", ...viewportQueryKey],
    queryFn: () => fetchDefectsForViewport(viewport!),
    enabled: viewport !== null && visibleLayers.defects,
    staleTime: 30_000,
    placeholderData: (previousData) => previousData
  });
  const adminMapData = useMemo<AdminMapData>(
    () => ({
      events: visibleLayers.events ? eventQuery.data ?? emptyAdminData.events : emptyAdminData.events,
      defects: visibleLayers.defects ? defectQuery.data ?? emptyAdminData.defects : emptyAdminData.defects
    }),
    [defectQuery.data, eventQuery.data, visibleLayers.defects, visibleLayers.events]
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
      selectedSegment?.section_end_offset_m
    ],
    queryFn: () => fetchSegmentChunksForSection(selectedSegment!),
    enabled: selectedSectionCanLoadChunks,
    staleTime: 60_000
  });
  const mapRailwayData = useMemo(
    () => ({
      ...railwayData,
      chunks: chunkQuery.data ?? { type: "FeatureCollection" as const, features: [] }
    }),
    [railwayData, chunkQuery.data]
  );
  const handleViewportChange = useCallback((nextViewport: RailwayMapViewport) => {
    setViewport((currentViewport) =>
      currentViewport &&
      Math.abs(currentViewport.minLon - nextViewport.minLon) < 0.001 &&
      Math.abs(currentViewport.minLat - nextViewport.minLat) < 0.001 &&
      Math.abs(currentViewport.maxLon - nextViewport.maxLon) < 0.001 &&
      Math.abs(currentViewport.maxLat - nextViewport.maxLat) < 0.001
        ? currentViewport
        : nextViewport
    );
  }, []);

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
        stationLoading={isStationLoading}
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
          <StatusBar isFallback={isFallback} error={apiError} />
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
          <AdminPanel segment={selectedSegment} selectedChunks={selectedChunks} />
        </div>
      )}
    </main>
  );
}

function MapLoadingOverlay({
  roadLoading,
  stationLoading,
  chunkLoading
}: {
  roadLoading: boolean;
  stationLoading: boolean;
  chunkLoading: boolean;
}) {
  const steps = [
    { key: "road", label: "\u0414\u043e\u0440\u043e\u0433\u0438", active: roadLoading },
    { key: "stations", label: "\u0421\u0442\u0430\u043d\u0446\u0438\u0438", active: stationLoading },
    { key: "chunks", label: "\u0427\u0430\u043d\u043a\u0438 100 \u043c", active: chunkLoading }
  ];
  const activeSteps = steps.filter((step) => step.active);

  if (activeSteps.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 w-[min(26rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-lg border border-neutral-200 bg-white/95 p-3 shadow-panel backdrop-blur md:bottom-5">
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.key} className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                step.active ? "animate-pulse bg-red-700" : "bg-neutral-300"
              }`}
            />
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded bg-neutral-100">
              <div
                className={`h-full rounded bg-red-700 transition-all ${
                  step.active ? "w-2/3 animate-pulse" : "w-full opacity-25"
                }`}
              />
            </div>
            <span className="w-28 shrink-0 text-right text-xs text-neutral-700">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
