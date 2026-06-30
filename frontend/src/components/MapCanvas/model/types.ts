import type { LayerKey } from "../../../store/mapStore";
import type { AdminMapData } from "../../../types/admin";
import type {
  RailwayChunkProperties,
  RailwayData,
  RailwayMapViewport,
  RailwaySegmentProperties
} from "../../../types/railway";

export type MapCanvasProps = {
  data: RailwayData;
  adminData: AdminMapData;
  visibleLayers: Record<LayerKey, boolean>;
  selectedSegment: RailwaySegmentProperties | null;
  selectedChunks: RailwayChunkProperties[];
  onViewportChange: (viewport: RailwayMapViewport) => void;
  onSelectSegment: (segment: RailwaySegmentProperties | null) => void;
  onToggleChunk: (chunk: RailwayChunkProperties) => void;
  onClearChunks: () => void;
  onRoadRenderStateChange: (isRendering: boolean) => void;
};
