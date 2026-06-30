import type { MutableRefObject } from "react";
import type maplibregl from "maplibre-gl";
import type { LayerKey } from "../../../../store/mapStore";
import type { AdminMapData } from "../../../../types/admin";
import type {
  RailwayChunkFeature,
  RailwayChunkProperties,
  RailwayData,
  RailwayFeature,
  RailwayMapViewport,
  RailwaySegmentProperties
} from "../../../../types/railway";

export type MapStateSnapshot = {
  data: RailwayData;
  adminData: AdminMapData;
  selectedFeature: RailwayFeature | null;
  selectedChunkFeatures: RailwayChunkFeature[];
  selectedChunks: RailwayChunkProperties[];
  visibleLayers: Record<LayerKey, boolean>;
};

export type MapCallbacks = {
  onSelectSegment: (segment: RailwaySegmentProperties | null) => void;
  onToggleChunk: (chunk: RailwayChunkProperties) => void;
  onClearChunks: () => void;
};

export type MapInteractionOptions = {
  map: maplibregl.Map;
  popupRef: MutableRefObject<maplibregl.Popup | null>;
  latestStateRef: MutableRefObject<MapStateSnapshot>;
  onViewportChangeRef: MutableRefObject<(viewport: RailwayMapViewport) => void>;
  callbacksRef: MutableRefObject<MapCallbacks>;
};
