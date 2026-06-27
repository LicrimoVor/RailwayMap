import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPanel } from "../components/AdminPanel";
import { LayerPanel } from "../components/LayerPanel";
import { MapCanvas } from "../components/MapCanvas";
import { SegmentDetails } from "../components/SegmentDetails";
import { StatusBar } from "../components/StatusBar";
import { TopBar } from "../components/TopBar";
import { useRailwayData } from "../hooks/useRailwayData";
import { fetchAdminMapData } from "../services/adminApi";
import { fetchSegmentChunksForSection } from "../services/railwayApi";
import { useMapStore } from "../store/mapStore";
import type { AdminMapData } from "../types/admin";

const emptyAdminData: AdminMapData = {
  events: { type: "FeatureCollection", features: [] },
  defects: { type: "FeatureCollection", features: [] }
};

export function MapPage() {
  const { railwayData, isFallback, isLoading, apiError, refetch } = useRailwayData();
  const visibleLayers = useMapStore((state) => state.visibleLayers);
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
  const adminMapQuery = useQuery({
    queryKey: ["admin-map-data"],
    queryFn: fetchAdminMapData,
    staleTime: 30_000
  });
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

  return (
    <main className="relative h-full w-full overflow-hidden">
      <MapCanvas
        data={mapRailwayData}
        adminData={adminMapQuery.data ?? emptyAdminData}
        visibleLayers={visibleLayers}
        selectedSegment={selectedSegment}
        selectedChunks={selectedChunks}
        onSelectSegment={(segment) => {
          setSelectedSegment(segment);
          if (segment) {
            setRightPanelOpen(true);
          }
        }}
        onToggleChunk={toggleSelectedChunk}
        onClearChunks={clearSelectedChunks}
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
