import { apiClient } from "../api";
import { readCachedValue, writeCachedValue } from "../../libs/indexedDbCache";
import { buildRailwaySummary } from "../../libs/railway";
import type {
	RailwayChunkFeatureCollection,
	RailwayData,
	RailwaySegmentProperties,
	StationFeatureCollection,
} from "../../types/railway";
import { fetchCollection } from "./collections";
import {
	INITIAL_RAILWAY_DATA_CACHE_KEY,
	SEGMENT_CHUNKS_CACHE_PREFIX,
	STATIONS_CACHE_KEY,
	emptyStationCollection,
} from "./constants";
import {
	normalizeChunks,
	normalizeSegments,
	normalizeStations,
} from "./normalizers";
export { emptyStationCollection } from "./constants";
export { bboxParamsForViewport } from "./viewport";
export type { ViewportBBoxParams } from "./viewport";

export async function loadCachedRailwayData(): Promise<RailwayData | null> {
	return readCachedValue<RailwayData>(INITIAL_RAILWAY_DATA_CACHE_KEY);
}

export async function fetchRailwayData(): Promise<RailwayData> {
	try {
		const railwayPayload = await fetchCollection("/segment-sections-10km");
		const segments = normalizeSegments(railwayPayload);
		const data: RailwayData = {
			segments,
			chunks: { type: "FeatureCollection", features: [] },
			stations: emptyStationCollection,
			summary: buildRailwaySummary(segments, emptyStationCollection),
		};

		void writeCachedValue(INITIAL_RAILWAY_DATA_CACHE_KEY, data);
		return data;
	} catch (error) {
		const cached = await readCachedValue<RailwayData>(
			INITIAL_RAILWAY_DATA_CACHE_KEY,
		);
		if (cached) {
			return cached;
		}
		throw error;
	}
}

export async function loadCachedStations(): Promise<StationFeatureCollection | null> {
	return readCachedValue<StationFeatureCollection>(STATIONS_CACHE_KEY);
}

export async function fetchStations(): Promise<StationFeatureCollection> {
	try {
		const stationPayload = await fetchCollection("/stations");
		const stations = normalizeStations(stationPayload);
		void writeCachedValue(STATIONS_CACHE_KEY, stations);
		return stations;
	} catch (error) {
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
