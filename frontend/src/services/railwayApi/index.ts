import { apiClient, isCanceledRequest } from "../api";
import { readCachedValue, writeCachedValue } from "../../libs/indexedDbCache";
import { buildRailwaySummary } from "../../libs/railway";
import type {
	RailwayChunkFeatureCollection,
	RailwayData,
	RailwayMapViewport,
	RailwaySegmentProperties,
	StationFeatureCollection,
} from "../../types/railway";
import { fetchCollection } from "./collections";
import {
	INITIAL_RAILWAY_DATA_CACHE_KEY,
	RAILWAY_LAST_CACHE_KEY,
	RAILWAY_VIEWPORT_CACHE_PREFIX,
	SEGMENT_CHUNKS_CACHE_PREFIX,
	STATIONS_LAST_CACHE_KEY,
	STATIONS_CACHE_KEY,
	STATIONS_VIEWPORT_CACHE_PREFIX,
	emptyStationCollection,
} from "./constants";
import {
	normalizeChunks,
	normalizeSegments,
	normalizeStations,
} from "./normalizers";
import { bboxCacheKey, bboxParamsForViewport } from "./viewport";
export { emptyStationCollection } from "./constants";
export { bboxParamsForViewport, viewportRequestKey } from "./viewport";
export type { ViewportBBoxParams } from "./viewport";

export async function loadCachedRailwayData(): Promise<RailwayData | null> {
	return (
		(await readCachedValue<RailwayData>(RAILWAY_LAST_CACHE_KEY)) ??
		(await readCachedValue<RailwayData>(INITIAL_RAILWAY_DATA_CACHE_KEY))
	);
}

export async function fetchRailwayData(
	viewport: RailwayMapViewport,
	signal?: AbortSignal,
): Promise<RailwayData> {
	const bboxParams = bboxParamsForViewport(viewport);
	const cacheKey = bboxCacheKey(RAILWAY_VIEWPORT_CACHE_PREFIX, bboxParams);

	try {
		const railwayPayload = await fetchCollection(
			"/segment-sections-10km",
			bboxParams,
			signal,
		);
		const segments = normalizeSegments(railwayPayload);
		const data: RailwayData = {
			segments,
			chunks: { type: "FeatureCollection", features: [] },
			stations: emptyStationCollection,
			summary: buildRailwaySummary(segments, emptyStationCollection),
		};

		void writeCachedValue(cacheKey, data);
		void writeCachedValue(RAILWAY_LAST_CACHE_KEY, data);
		return data;
	} catch (error) {
		if (isCanceledRequest(error)) {
			throw error;
		}

		const cached =
			(await readCachedValue<RailwayData>(cacheKey)) ??
			(await readCachedValue<RailwayData>(RAILWAY_LAST_CACHE_KEY)) ??
			(await readCachedValue<RailwayData>(INITIAL_RAILWAY_DATA_CACHE_KEY));
		if (cached) {
			return cached;
		}
		throw error;
	}
}

export async function loadCachedStations(): Promise<StationFeatureCollection | null> {
	return (
		(await readCachedValue<StationFeatureCollection>(STATIONS_LAST_CACHE_KEY)) ??
		(await readCachedValue<StationFeatureCollection>(STATIONS_CACHE_KEY))
	);
}

export async function fetchStationsForViewport(
	viewport: RailwayMapViewport,
	signal?: AbortSignal,
): Promise<StationFeatureCollection> {
	const bboxParams = bboxParamsForViewport(viewport);
	const cacheKey = bboxCacheKey(STATIONS_VIEWPORT_CACHE_PREFIX, bboxParams);

	try {
		const stationPayload = await fetchCollection("/stations", bboxParams, signal);
		const stations = normalizeStations(stationPayload);
		void writeCachedValue(cacheKey, stations);
		void writeCachedValue(STATIONS_LAST_CACHE_KEY, stations);
		return stations;
	} catch (error) {
		if (isCanceledRequest(error)) {
			throw error;
		}

		const cached =
			(await readCachedValue<StationFeatureCollection>(cacheKey)) ??
			(await readCachedValue<StationFeatureCollection>(STATIONS_LAST_CACHE_KEY)) ??
			(await readCachedValue<StationFeatureCollection>(STATIONS_CACHE_KEY));
		if (cached) {
			return cached;
		}
		throw error;
	}
}

export async function fetchStations(
	signal?: AbortSignal,
): Promise<StationFeatureCollection> {
	try {
		const stationPayload = await fetchCollection("/stations", {}, signal);
		const stations = normalizeStations(stationPayload);
		void writeCachedValue(STATIONS_CACHE_KEY, stations);
		return stations;
	} catch (error) {
		if (isCanceledRequest(error)) {
			throw error;
		}

		const cached =
			await readCachedValue<StationFeatureCollection>(STATIONS_CACHE_KEY);
		if (cached) {
			return cached;
		}
		throw error;
	}
}

export async function fetchSegmentChunksForSection(
	section: RailwaySegmentProperties,
	signal?: AbortSignal,
): Promise<RailwayChunkFeatureCollection> {
	const cacheKey = segmentChunksCacheKey(section);
	const cached =
		await readCachedValue<RailwayChunkFeatureCollection>(cacheKey);
	if (cached) {
		return cached;
	}

	const response = await apiClient.get("/segment-chunks", {
		params: {
			segment_id: section.id,
			start_offset_m: section.section_start_offset_m,
			end_offset_m: section.section_end_offset_m,
			limit: 5_000,
		},
		signal,
	});
	const chunks = normalizeChunks(response.data);
	void writeCachedValue(cacheKey, chunks);
	return chunks;
}

function segmentChunksCacheKey(section: RailwaySegmentProperties): string {
	return [
		SEGMENT_CHUNKS_CACHE_PREFIX,
		section.id,
		section.section_start_offset_m ?? 0,
		section.section_end_offset_m ?? 0,
	].join(":");
}
