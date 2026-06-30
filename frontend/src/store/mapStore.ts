import { create } from "zustand";
import type {
	RailwayChunkProperties,
	RailwaySegmentProperties,
} from "../types/railway";

export type LayerKey = "railways" | "stations" | "electrification" | "defects";

type MapState = {
	visibleLayers: Record<LayerKey, boolean>;
	selectedSegment: RailwaySegmentProperties | null;
	selectedChunks: RailwayChunkProperties[];
	toggleLayer: (key: LayerKey) => void;
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
		defects: false,
	},
	selectedSegment: null,
	selectedChunks: [],
	toggleLayer: (key) =>
		set((state) => ({
			visibleLayers: {
				...state.visibleLayers,
				[key]: !state.visibleLayers[key],
			},
		})),
	setSelectedSegment: (segment) => set({ selectedSegment: segment }),
	toggleSelectedChunk: (chunk) =>
		set((state) => {
			const exists = state.selectedChunks.some(
				(item) => String(item.id) === String(chunk.id),
			);
			return {
				selectedChunks: exists
					? state.selectedChunks.filter(
							(item) => String(item.id) !== String(chunk.id),
						)
					: [...state.selectedChunks, chunk],
			};
		}),
	clearSelectedChunks: () => set({ selectedChunks: [] }),
	clearSelection: () => set({ selectedSegment: null, selectedChunks: [] }),
}));
