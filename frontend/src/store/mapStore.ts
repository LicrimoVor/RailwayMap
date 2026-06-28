import { create } from "zustand";
import type { RailwayChunkProperties, RailwaySegmentProperties } from "../types/railway";

export type LayerKey =
  | "railways"
  | "stations"
  | "electrification"
  | "defects"
  | "events";

type MapState = {
  visibleLayers: Record<LayerKey, boolean>;
  selectedSegment: RailwaySegmentProperties | null;
  selectedChunks: RailwayChunkProperties[];
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  toggleLayer: (key: LayerKey) => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setSelectedSegment: (segment: RailwaySegmentProperties | null) => void;
  toggleSelectedChunk: (chunk: RailwayChunkProperties) => void;
  clearSelectedChunks: () => void;
  clearSelection: () => void;
};

export const useMapStore = create<MapState>((set) => ({
  visibleLayers: {
    railways: true,
    stations: false,
    electrification: true,
    defects: true,
    events: true
  },
  selectedSegment: null,
  selectedChunks: [],
  leftPanelOpen: true,
  rightPanelOpen: true,
  toggleLayer: (key) =>
    set((state) => ({
      visibleLayers: {
        ...state.visibleLayers,
        [key]: !state.visibleLayers[key]
      }
    })),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  setSelectedSegment: (segment) => set({ selectedSegment: segment }),
  toggleSelectedChunk: (chunk) =>
    set((state) => {
      const exists = state.selectedChunks.some((item) => String(item.id) === String(chunk.id));
      return {
        selectedChunks: exists
          ? state.selectedChunks.filter((item) => String(item.id) !== String(chunk.id))
          : [...state.selectedChunks, chunk]
      };
    }),
  clearSelectedChunks: () => set({ selectedChunks: [] }),
  clearSelection: () => set({ selectedSegment: null, selectedChunks: [] })
}));
