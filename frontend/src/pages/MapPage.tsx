import { LayerPanel } from "../components/LayerPanel";
import { MapCanvas } from "../components/MapCanvas";
import { SegmentDetails } from "../components/SegmentDetails";
import { StatusBar } from "../components/StatusBar";
import { TopBar } from "../components/TopBar";
import { useRailwayData } from "../hooks/useRailwayData";
import { useMapStore } from "../store/mapStore";

export function MapPage() {
  const { railwayData, isFallback, isLoading, apiError, refetch } = useRailwayData();
  const visibleLayers = useMapStore((state) => state.visibleLayers);
  const selectedSegment = useMapStore((state) => state.selectedSegment);
  const toggleLayer = useMapStore((state) => state.toggleLayer);
  const setSelectedSegment = useMapStore((state) => state.setSelectedSegment);

  return (
    <main className="relative h-full w-full overflow-hidden">
      <MapCanvas
        data={railwayData}
        visibleLayers={visibleLayers}
        selectedSegment={selectedSegment}
        onSelectSegment={setSelectedSegment}
      />

      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 md:inset-x-5">
        <TopBar isFallback={isFallback} isLoading={isLoading} onRefresh={() => void refetch()} />
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 grid gap-3 md:bottom-5 md:left-5 md:right-auto md:top-24 md:w-80 md:auto-rows-min">
        <LayerPanel
          visibleLayers={visibleLayers}
          onToggleLayer={toggleLayer}
          summary={railwayData.summary}
        />
        <StatusBar isFallback={isFallback} error={apiError} />
      </div>

      <div className="pointer-events-none absolute left-3 right-3 top-24 z-10 md:bottom-5 md:left-auto md:right-5 md:w-96">
        <SegmentDetails segment={selectedSegment} onClose={() => setSelectedSegment(null)} />
      </div>
    </main>
  );
}
