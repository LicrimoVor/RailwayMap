export type TopBarProps = {
  isFallback: boolean;
  isLoading: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onOpenLeftPanel: () => void;
  onOpenRightPanel: () => void;
  onRefresh: () => void;
};
