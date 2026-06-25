import type {
  RailwayFeature,
  RailwayChunkFeature,
  RailwayChunkFeatureCollection,
  RailwayFeatureCollection,
  RailwaySegmentProperties,
  RailwaySummary,
  StationFeatureCollection
} from "../../types/railway";

export function buildRailwaySummary(
  segments: RailwayFeatureCollection,
  stations: StationFeatureCollection
): RailwaySummary {
  const counts = new Map<string, number>();

  for (const feature of segments.features) {
    const key = feature.properties.electrified || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return {
    segmentCount: segments.features.length,
    stationCount: stations.features.length,
    electrification: Array.from(counts, ([name, count]) => ({ name, count }))
  };
}

export function findChunkFeaturesByIds(
  chunks: RailwayChunkFeatureCollection,
  ids: Array<string | number>
): RailwayChunkFeature[] {
  const selectedIds = new Set(ids.map(String));
  return chunks.features.filter((feature) => selectedIds.has(String(feature.properties.id)));
}

export function findFeatureById(
  segments: RailwayFeatureCollection,
  id: string | number | null
): RailwayFeature | null {
  if (id === null) {
    return null;
  }
  return segments.features.find((feature) => String(feature.properties.id) === String(id)) ?? null;
}

export function formatLength(value: RailwaySegmentProperties["length_m"]): string {
  const meters = Number(value);
  if (!Number.isFinite(meters) || meters <= 0) {
    return "n/a";
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
  }
  return `${Math.round(meters)} m`;
}

export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "n/a";
  }
  return String(value);
}
