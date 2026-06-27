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

const emptyEvents: RailwayEventCollection = { type: "FeatureCollection", features: [] };
const emptyDefects: DefectCollection = { type: "FeatureCollection", features: [] };

export async function fetchAdminMapData(): Promise<AdminMapData> {
  const [eventsResponse, defectsResponse] = await Promise.all([
    apiClient.get("/events"),
    apiClient.get("/defects")
  ]);

  return {
    events: asEventCollection(eventsResponse.data),
    defects: asDefectCollection(defectsResponse.data)
  };
}

export async function fetchSegmentAdminData(segmentId: number): Promise<SegmentAdminData> {
  const [eventsResponse, defectsResponse, parametersResponse, eventTypesResponse] = await Promise.all([
    apiClient.get("/events", { params: { segment_id: segmentId } }),
    apiClient.get("/defects", { params: { segment_id: segmentId } }),
    apiClient.get("/segment-parameters", { params: { segment_id: segmentId } }),
    apiClient.get("/event-types")
  ]);

  return {
    events: asEventCollection(eventsResponse.data),
    defects: asDefectCollection(defectsResponse.data),
    parameters: Array.isArray(parametersResponse.data) ? parametersResponse.data : [],
    eventTypes: Array.isArray(eventTypesResponse.data) ? eventTypesResponse.data : []
  };
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
