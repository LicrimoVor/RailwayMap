import type { RailwayChunkProperties, RailwaySegmentProperties } from "../../../types/railway";

export type SegmentDetailsProps = {
  segment: RailwaySegmentProperties | null;
  selectedChunks: RailwayChunkProperties[];
  onCollapse: () => void;
  onClose: () => void;
};
