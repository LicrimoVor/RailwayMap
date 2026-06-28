import type { Feature, FeatureCollection, LineStringGeometry, PointGeometry } from "./geojson";

export type RailwaySegmentProperties = {
  id: number | string;
  section_id?: number | string | null;
  section_index?: number | null;
  section_start_offset_m?: number | string | null;
  section_end_offset_m?: number | string | null;
  section_length_m?: number | string | null;
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

export type RailwayChunkProperties = {
  id: number | string;
  segment_id: number | string;
  chunk_index: number;
  start_offset_m: number | string;
  end_offset_m: number | string;
  length_m: number | string;
  geometry?: LineStringGeometry;
};

export type StationProperties = {
  id: number | string;
  osm_id?: number | null;
  name: string;
  esr_code?: string | null;
};

export type RailwayFeature = Feature<LineStringGeometry, RailwaySegmentProperties>;
export type RailwayChunkFeature = Feature<LineStringGeometry, RailwayChunkProperties>;
export type StationFeature = Feature<PointGeometry, StationProperties>;

export type RailwayFeatureCollection = FeatureCollection<RailwayFeature>;
export type RailwayChunkFeatureCollection = FeatureCollection<RailwayChunkFeature>;
export type StationFeatureCollection = FeatureCollection<StationFeature>;

export type RailwaySummary = {
  segmentCount: number;
  stationCount: number;
  electrification: Array<{ name: string; count: number }>;
};

export type RailwayMapViewport = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
  zoom: number;
};

export type RailwayData = {
  segments: RailwayFeatureCollection;
  chunks: RailwayChunkFeatureCollection;
  stations: StationFeatureCollection;
  summary: RailwaySummary;
};
