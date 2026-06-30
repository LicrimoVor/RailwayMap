export type TopBarProps = {
  isFallback: boolean;
  isLoading: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelActiveTab: "details" | "elevation";
  onOpenLeftPanel: () => void;
  onOpenRightPanel: () => void;
  onOpenElevationPanel: () => void;
  onRefresh: () => void;
};
