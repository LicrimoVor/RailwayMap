import type {
  RailwayChunkProperties,
  RailwayFeature,
  RailwaySegmentProperties
} from "../../../types/railway";

export type SegmentDetailsTab = "details" | "elevation";

export type SegmentDetailsProps = {
  segment: RailwaySegmentProperties | null;
  selectedFeature: RailwayFeature | null;
  selectedChunks: RailwayChunkProperties[];
  activeTab: SegmentDetailsTab;
  onTabChange: (tab: SegmentDetailsTab) => void;
  onCollapse: () => void;
  onClose: () => void;
};
