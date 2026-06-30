import type { StationFeatureCollection } from "../../types/railway";

export const PAGE_SIZE = 50_000;
export const INITIAL_RAILWAY_DATA_CACHE_KEY = "railway-data:initial-10km:v1";
export const RAILWAY_VIEWPORT_CACHE_PREFIX = "railway-data:viewport-10km:v1";
export const RAILWAY_LAST_CACHE_KEY = "railway-data:viewport-10km:last:v1";
export const STATIONS_CACHE_KEY = "railway-data:stations:v1";
export const STATIONS_VIEWPORT_CACHE_PREFIX = "railway-data:stations:viewport:v1";
export const STATIONS_LAST_CACHE_KEY = "railway-data:stations:viewport:last:v1";
export const SEGMENT_CHUNKS_CACHE_PREFIX = "segment-chunks:v4";

export const emptyStationCollection: StationFeatureCollection = {
	type: "FeatureCollection",
	features: [],
};
