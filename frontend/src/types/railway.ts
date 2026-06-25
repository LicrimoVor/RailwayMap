import type { Feature, FeatureCollection, LineStringGeometry, PointGeometry } from "./geojson";

export type RailwaySegmentProperties = {
  id: number | string;
  osm_id?: number | null;
  name?: string | null;
  branch?: string | null;
  operator?: string | null;
  gauge?: number | null;
  electrified?: string | null;
  voltage?: number | null;
  frequency?: number | string | null;
  usage?: string | null;
  railway_type?: string | null;
  passenger_lines?: number | null;
  length_m?: number | string | null;
};

export type StationProperties = {
  id: number | string;
  osm_id?: number | null;
  name: string;
  esr_code?: string | null;
};

export type RailwayFeature = Feature<LineStringGeometry, RailwaySegmentProperties>;
export type StationFeature = Feature<PointGeometry, StationProperties>;

export type RailwayFeatureCollection = FeatureCollection<RailwayFeature>;
export type StationFeatureCollection = FeatureCollection<StationFeature>;

export type RailwaySummary = {
  segmentCount: number;
  stationCount: number;
  electrification: Array<{ name: string; count: number }>;
};

export type RailwayData = {
  segments: RailwayFeatureCollection;
  stations: StationFeatureCollection;
  summary: RailwaySummary;
};
