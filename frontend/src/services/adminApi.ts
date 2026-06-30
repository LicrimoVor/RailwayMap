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
const ADMIN_EVENTS_CACHE_PREFIX = "admin-map-events:v1";
const ADMIN_DEFECTS_CACHE_PREFIX = "admin-map-defects:v1";
const SEGMENT_ADMIN_DATA_CACHE_PREFIX = "segment-admin-data:v2";

export async function fetchEventsForViewport(
  viewport: RailwayMapViewport
): Promise<RailwayEventCollection> {
  return fetchViewportCollection(
    viewport,
    "/events",
    ADMIN_EVENTS_CACHE_PREFIX,
    asEventCollection
  );
}

export async function fetchDefectsForViewport(
  viewport: RailwayMapViewport
): Promise<DefectCollection> {
  return fetchViewportCollection(
    viewport,
    "/defects",
    ADMIN_DEFECTS_CACHE_PREFIX,
    asDefectCollection
  );
}

export async function fetchSegmentAdminData(segmentId: number): Promise<SegmentAdminData> {
  const cacheKey = segmentAdminDataCacheKey(segmentId);

  try {
    const [eventsResponse, defectsResponse, parametersResponse, eventTypesResponse] =
      await Promise.all([
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

export function defaultEventType(eventTypes: EventType[]): EventType {
  return eventTypes[0] ?? { id: 0, name: "Предупреждение", color: "#eab308" };
}

async function fetchViewportCollection<T>(
  viewport: RailwayMapViewport,
  endpoint: string,
  cachePrefix: string,
  normalize: (value: unknown) => T
): Promise<T> {
  const bboxParams = bboxParamsForViewport(viewport);
  const cacheKey = viewportCacheKey(cachePrefix, bboxParams);
  const lastCacheKey = `${cachePrefix}:last`;

  try {
    const response = await apiClient.get(endpoint, { params: bboxParams });
    const data = normalize(response.data);
    void writeCachedValue(cacheKey, data);
    void writeCachedValue(lastCacheKey, data);
    return data;
  } catch (error) {
    const cached = (await readCachedValue<T>(cacheKey)) ?? (await readCachedValue<T>(lastCacheKey));
    if (cached) {
      return cached;
    }
    throw error;
  }
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

function viewportCacheKey(
  prefix: string,
  bboxParams: ReturnType<typeof bboxParamsForViewport>
): string {
  return [
    prefix,
    bboxParams.min_lon.toFixed(2),
    bboxParams.min_lat.toFixed(2),
    bboxParams.max_lon.toFixed(2),
    bboxParams.max_lat.toFixed(2)
  ].join(":");
}

function segmentAdminDataCacheKey(segmentId: number): string {
  return `${SEGMENT_ADMIN_DATA_CACHE_PREFIX}:${segmentId}`;
}
