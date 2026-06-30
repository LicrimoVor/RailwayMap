import type { LineStringGeometry, MultiLineStringGeometry, PointGeometry } from "../../../types/geojson";
import type { RailwayChunkProperties, RailwaySegmentProperties } from "../../../types/railway";
import type { createDefect, createEvent, createSegmentParameter } from "../../../services/adminApi";

export type AdminPanelProps = {
  segment: RailwaySegmentProperties | null;
  selectedChunks: RailwayChunkProperties[];
};

export type AdminPanelTab = "event" | "defect" | "parameter";

export type EventGeometry = LineStringGeometry | MultiLineStringGeometry | undefined;

export type DefectGeometry = PointGeometry | undefined;

export type EventPayload = Parameters<typeof createEvent>[0];

export type DefectPayload = Parameters<typeof createDefect>[0];

export type ParameterPayload = Parameters<typeof createSegmentParameter>[0];
