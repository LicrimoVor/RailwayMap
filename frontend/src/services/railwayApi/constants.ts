import type { StationFeatureCollection } from "../../types/railway";

export const PAGE_SIZE = 50_000;
export const INITIAL_RAILWAY_DATA_CACHE_KEY = "railway-data:initial-10km:v1";
export const STATIONS_CACHE_KEY = "railway-data:stations:v1";
export const SEGMENT_CHUNKS_CACHE_PREFIX = "segment-chunks:v4";

export const emptyStationCollection: StationFeatureCollection = {
  type: "FeatureCollection",
  features: []
};
