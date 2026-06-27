import { apiClient } from "./api";
import type {
  RailwayData,
  RailwayChunkFeature,
  RailwayChunkFeatureCollection,
  RailwayChunkProperties,
  RailwayFeature,
  RailwayFeatureCollection,
  RailwaySegmentProperties,
  StationFeature,
  StationFeatureCollection,
  StationProperties
} from "../types/railway";
import { buildRailwaySummary } from "../libs/railway";

type ApiCollection<T> = T[] | { items?: T[]; features?: T[]; type?: string };
const PAGE_SIZE = 25_000;

export async function fetchRailwayData(): Promise<RailwayData> {
  const [sectionPayloads, stationPayloads] = await Promise.all([
    fetchPagedCollections("/segment-sections-10km"),
    fetchPagedCollections("/stations")
  ]);

  const segments = mergeSegmentCollections(sectionPayloads.map(normalizeSegments));
  const stations = mergeStationCollections(stationPayloads.map(normalizeStations));

  return {
    segments,
    chunks: { type: "FeatureCollection", features: [] },
    stations,
    summary: buildRailwaySummary(segments, stations)
  };
}

export async function fetchSegmentChunksForSection(
  section: RailwaySegmentProperties
): Promise<RailwayChunkFeatureCollection> {
  const response = await apiClient.get("/segment-chunks", {
    params: {
      segment_id: section.id,
      start_offset_m: section.section_start_offset_m,
      end_offset_m: section.section_end_offset_m,
      limit: 5_000
    }
  });
  return normalizeChunks(response.data);
}

async function fetchPagedCollections(endpoint: string): Promise<Array<ApiCollection<Record<string, unknown>>>> {
  const pages: Array<ApiCollection<Record<string, unknown>>> = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await apiClient.get(endpoint, {
      params: { limit: PAGE_SIZE, offset }
    });
    const featureCount = collectionSize(response.data);
    pages.push(response.data);

    if (featureCount < PAGE_SIZE) {
      return pages;
    }
  }
}

function collectionSize(payload: ApiCollection<Record<string, unknown>>): number {
  if (Array.isArray(payload)) {
    return payload.length;
  }
  if (Array.isArray(payload.features)) {
    return payload.features.length;
  }
  if (Array.isArray(payload.items)) {
    return payload.items.length;
  }
  return 0;
}

function mergeSegmentCollections(collections: RailwayFeatureCollection[]): RailwayFeatureCollection {
  return {
    type: "FeatureCollection",
    features: collections.flatMap((collection) => collection.features)
  };
}

function mergeStationCollections(collections: StationFeatureCollection[]): StationFeatureCollection {
  return {
    type: "FeatureCollection",
    features: collections.flatMap((collection) => collection.features)
  };
}

function normalizeSegments(payload: ApiCollection<Record<string, unknown>>): RailwayFeatureCollection {
  if (isFeatureCollection(payload)) {
    return payload as RailwayFeatureCollection;
  }

  const items = Array.isArray(payload) ? payload : payload.items ?? payload.features ?? [];
  return {
    type: "FeatureCollection",
    features: items.map(segmentToFeature).filter((item): item is RailwayFeature => item !== null)
  };
}

function normalizeStations(payload: ApiCollection<Record<string, unknown>>): StationFeatureCollection {
  if (isFeatureCollection(payload)) {
    return payload as StationFeatureCollection;
  }

  const items = Array.isArray(payload) ? payload : payload.items ?? payload.features ?? [];
  return {
    type: "FeatureCollection",
    features: items.map(stationToFeature).filter((item): item is StationFeature => item !== null)
  };
}

function normalizeChunks(payload: ApiCollection<Record<string, unknown>>): RailwayChunkFeatureCollection {
  if (isFeatureCollection(payload)) {
    return payload as RailwayChunkFeatureCollection;
  }

  const items = Array.isArray(payload) ? payload : payload.items ?? payload.features ?? [];
  return {
    type: "FeatureCollection",
    features: items.map(chunkToFeature).filter((item): item is RailwayChunkFeature => item !== null)
  };
}

function isFeatureCollection(payload: unknown): payload is { type: "FeatureCollection" } {
  return typeof payload === "object" && payload !== null && "type" in payload;
}

function segmentToFeature(record: Record<string, unknown>): RailwayFeature | null {
  const geometry = record.geometry;
  if (!isLineStringGeometry(geometry)) {
    return null;
  }

  const id = (record.id as number | string | undefined) ?? (record.osm_id as number | string | undefined);
  if (id === undefined) {
    return null;
  }

  const properties: RailwaySegmentProperties = {
    id,
    section_id: asNullableNumber(record.section_id),
    section_index: asNullableNumber(record.section_index),
    section_start_offset_m: asNullableNumber(record.section_start_offset_m),
    section_end_offset_m: asNullableNumber(record.section_end_offset_m),
    section_length_m: asNullableNumber(record.section_length_m),
    osm_id: asNullableNumber(record.osm_id),
    name: asNullableString(record.name),
    branch: asNullableString(record.branch),
    operator: asNullableString(record.operator),
    gauge: asNullableNumber(record.gauge),
    electrified: asNullableString(record.electrified),
    voltage: asNullableNumber(record.voltage),
    frequency: asNullableString(record.frequency),
    usage: asNullableString(record.usage),
    railway_type: asNullableString(record.railway_type),
    passenger_lines: asNullableNumber(record.passenger_lines),
    length_m: asNullableNumber(record.length_m)
  };

  return { type: "Feature", id, geometry, properties };
}

function stationToFeature(record: Record<string, unknown>): StationFeature | null {
  const geometry = record.geometry;
  if (!isPointGeometry(geometry)) {
    return null;
  }

  const id = (record.id as number | string | undefined) ?? (record.osm_id as number | string | undefined);
  const name = asNullableString(record.name);
  if (id === undefined || name === null) {
    return null;
  }

  const properties: StationProperties = {
    id,
    osm_id: asNullableNumber(record.osm_id),
    name,
    esr_code: asNullableString(record.esr_code)
  };

  return { type: "Feature", id, geometry, properties };
}

function chunkToFeature(record: Record<string, unknown>): RailwayChunkFeature | null {
  const geometry = record.geometry;
  if (!isLineStringGeometry(geometry)) {
    return null;
  }

  const id = record.id as number | string | undefined;
  const segmentId = record.segment_id as number | string | undefined;
  if (id === undefined || segmentId === undefined) {
    return null;
  }

  const properties: RailwayChunkProperties = {
    id,
    segment_id: segmentId,
    chunk_index: asNullableNumber(record.chunk_index) ?? 0,
    start_offset_m: asNullableNumber(record.start_offset_m) ?? 0,
    end_offset_m: asNullableNumber(record.end_offset_m) ?? 0,
    length_m: asNullableNumber(record.length_m) ?? 0
  };

  return { type: "Feature", id, geometry, properties };
}

function isLineStringGeometry(value: unknown): value is RailwayFeature["geometry"] {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "LineString" &&
    "coordinates" in value &&
    Array.isArray(value.coordinates)
  );
}

function isPointGeometry(value: unknown): value is StationFeature["geometry"] {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "Point" &&
    "coordinates" in value &&
    Array.isArray(value.coordinates)
  );
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value);
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
