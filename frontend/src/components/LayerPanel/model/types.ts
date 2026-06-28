import type { LayerKey } from "../../../store/mapStore";
import type { RailwaySummary } from "../../../types/railway";

export type LayerPanelProps = {
  visibleLayers: Record<LayerKey, boolean>;
  onToggleLayer: (key: LayerKey) => void;
  onCollapse: () => void;
  summary: RailwaySummary;
};
