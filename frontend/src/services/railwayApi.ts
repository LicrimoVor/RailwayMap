import { apiClient } from "./api";
import type {
  RailwayData,
  RailwayFeature,
  RailwayFeatureCollection,
  RailwaySegmentProperties,
  StationFeature,
  StationFeatureCollection,
  StationProperties
} from "../types/railway";
import { buildRailwaySummary } from "../features/map/utils";

type ApiCollection<T> = T[] | { items?: T[]; features?: T[]; type?: string };

export async function fetchRailwayData(): Promise<RailwayData> {
  const [segmentsResponse, stationsResponse] = await Promise.all([
    apiClient.get("/segments"),
    apiClient.get("/stations")
  ]);

  const segments = normalizeSegments(segmentsResponse.data);
  const stations = normalizeStations(stationsResponse.data);

  return {
    segments,
    stations,
    summary: buildRailwaySummary(segments, stations)
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
