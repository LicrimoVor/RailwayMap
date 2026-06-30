import type {
  RailwayChunkFeature,
  RailwayChunkFeatureCollection,
  RailwayChunkProperties,
  RailwayFeature,
  RailwayFeatureCollection,
  RailwaySegmentProperties,
  StationFeature,
  StationFeatureCollection,
  StationProperties
} from "../../types/railway";
import type { ApiCollection } from "./collections";
import { isFeatureCollection } from "./collections";

export function normalizeSegments(
  payload: ApiCollection<Record<string, unknown>>
): RailwayFeatureCollection {
  if (isFeatureCollection(payload)) {
    return payload as RailwayFeatureCollection;
  }

  return {
    type: "FeatureCollection",
    features: collectionItems(payload)
      .map(segmentToFeature)
      .filter((item): item is RailwayFeature => item !== null)
  };
}

export function normalizeStations(
  payload: ApiCollection<Record<string, unknown>>
): StationFeatureCollection {
  if (isFeatureCollection(payload)) {
    return payload as StationFeatureCollection;
  }

  return {
    type: "FeatureCollection",
    features: collectionItems(payload)
      .map(stationToFeature)
      .filter((item): item is StationFeature => item !== null)
  };
}

export function normalizeChunks(
  payload: ApiCollection<Record<string, unknown>>
): RailwayChunkFeatureCollection {
  if (isFeatureCollection(payload)) {
    return payload as RailwayChunkFeatureCollection;
  }

  return {
    type: "FeatureCollection",
    features: collectionItems(payload)
      .map(chunkToFeature)
      .filter((item): item is RailwayChunkFeature => item !== null)
  };
}

function collectionItems(payload: ApiCollection<Record<string, unknown>>) {
  return Array.isArray(payload) ? payload : payload.items ?? payload.features ?? [];
}

function segmentToFeature(record: Record<string, unknown>): RailwayFeature | null {
  const geometry = record.geometry;
  if (!isLineStringGeometry(geometry)) {
    return null;
  }

  const id =
    (record.id as number | string | undefined) ??
    (record.osm_id as number | string | undefined);
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

  const id =
    (record.id as number | string | undefined) ??
    (record.osm_id as number | string | undefined);
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
  return isGeometry(value, "LineString");
}

function isPointGeometry(value: unknown): value is StationFeature["geometry"] {
  return isGeometry(value, "Point");
}

function isGeometry(value: unknown, type: "LineString" | "Point"): value is { type: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === type &&
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
