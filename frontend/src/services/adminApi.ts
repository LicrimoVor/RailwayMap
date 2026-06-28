import { apiClient } from "./api";
import type {
  AdminMapData,
  CreateDefectInput,
  CreateEventInput,
  CreateParameterInput,
  DefectCollection,
  EventType,
  RailwayEventCollection,
  SegmentAdminData,
  SegmentParameter
} from "../types/admin";
import type { RailwayMapViewport } from "../types/railway";
import { readCachedValue, writeCachedValue } from "../libs/indexedDbCache";
import { bboxParamsForViewport } from "./railwayApi";

const emptyEvents: RailwayEventCollection = { type: "FeatureCollection", features: [] };
const emptyDefects: DefectCollection = { type: "FeatureCollection", features: [] };
const ADMIN_MAP_DATA_CACHE_PREFIX = "admin-map-data:v3";
const ADMIN_LAST_MAP_DATA_CACHE_KEY = `${ADMIN_MAP_DATA_CACHE_PREFIX}:last`;
const SEGMENT_ADMIN_DATA_CACHE_PREFIX = "segment-admin-data:v2";

export async function fetchAdminMapData(viewport: RailwayMapViewport): Promise<AdminMapData> {
  const bboxParams = bboxParamsForViewport(viewport);
  const cacheKey = [
    ADMIN_MAP_DATA_CACHE_PREFIX,
    bboxParams.min_lon.toFixed(2),
    bboxParams.min_lat.toFixed(2),
    bboxParams.max_lon.toFixed(2),
    bboxParams.max_lat.toFixed(2)
  ].join(":");

  try {
    const [eventsResponse, defectsResponse] = await Promise.all([
      apiClient.get("/events", { params: bboxParams }),
      apiClient.get("/defects", { params: bboxParams })
    ]);

    const data = {
      events: asEventCollection(eventsResponse.data),
      defects: asDefectCollection(defectsResponse.data)
    };
    void writeCachedValue(cacheKey, data);
    void writeCachedValue(ADMIN_LAST_MAP_DATA_CACHE_KEY, data);
    return data;
  } catch (error) {
    const cached =
      (await readCachedValue<AdminMapData>(cacheKey)) ??
      (await readCachedValue<AdminMapData>(ADMIN_LAST_MAP_DATA_CACHE_KEY));
    if (cached) {
      return cached;
    }
    throw error;
  }
}

export async function fetchSegmentAdminData(segmentId: number): Promise<SegmentAdminData> {
  const cacheKey = segmentAdminDataCacheKey(segmentId);

  try {
    const [eventsResponse, defectsResponse, parametersResponse, eventTypesResponse] = await Promise.all([
      apiClient.get("/events", { params: { segment_id: segmentId } }),
      apiClient.get("/defects", { params: { segment_id: segmentId } }),
      apiClient.get("/segment-parameters", { params: { segment_id: segmentId } }),
      apiClient.get("/event-types")
    ]);

    const data = {
      events: asEventCollection(eventsResponse.data),
      defects: asDefectCollection(defectsResponse.data),
      parameters: Array.isArray(parametersResponse.data) ? parametersResponse.data : [],
      eventTypes: Array.isArray(eventTypesResponse.data) ? eventTypesResponse.data : []
    };
    void writeCachedValue(cacheKey, data);
    return data;
  } catch (error) {
    const cached = await readCachedValue<SegmentAdminData>(cacheKey);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

export async function createEvent(payload: CreateEventInput) {
  const response = await apiClient.post("/events", payload);
  return response.data;
}

export async function createDefect(payload: CreateDefectInput) {
  const response = await apiClient.post("/defects", payload);
  return response.data;
}

export async function createSegmentParameter(payload: CreateParameterInput) {
  const response = await apiClient.post("/segment-parameters", payload);
  return response.data as SegmentParameter;
}

function asEventCollection(value: unknown): RailwayEventCollection {
  return isFeatureCollection(value) ? (value as RailwayEventCollection) : emptyEvents;
}

function asDefectCollection(value: unknown): DefectCollection {
  return isFeatureCollection(value) ? (value as DefectCollection) : emptyDefects;
}

function isFeatureCollection(value: unknown): value is { type: "FeatureCollection" } {
  return typeof value === "object" && value !== null && "type" in value;
}

export function defaultEventType(eventTypes: EventType[]): EventType {
  return eventTypes[0] ?? { id: 0, name: "Предупреждение", color: "#eab308" };
}

function segmentAdminDataCacheKey(segmentId: number): string {
  return `${SEGMENT_ADMIN_DATA_CACHE_PREFIX}:${segmentId}`;
}
