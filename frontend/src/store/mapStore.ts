import { create } from "zustand";
import type { RailwaySegmentProperties } from "../types/railway";

export type LayerKey =
  | "railways"
  | "stations"
  | "electrification"
  | "defects"
  | "speedLimits"
  | "events"
  | "relief"
  | "heatmaps";

type MapState = {
  visibleLayers: Record<LayerKey, boolean>;
  selectedSegment: RailwaySegmentProperties | null;
  toggleLayer: (key: LayerKey) => void;
  setSelectedSegment: (segment: RailwaySegmentProperties | null) => void;
};

export const useMapStore = create<MapState>((set) => ({
  visibleLayers: {
    railways: true,
    stations: true,
    electrification: true,
    defects: false,
    speedLimits: false,
    events: false,
    relief: false,
    heatmaps: false
  },
  selectedSegment: null,
  toggleLayer: (key) =>
    set((state) => ({
      visibleLayers: {
        ...state.visibleLayers,
        [key]: !state.visibleLayers[key]
      }
    })),
  setSelectedSegment: (segment) => set({ selectedSegment: segment })
}));
