import type {
  RailwayChunkFeature,
  RailwayChunkProperties,
  RailwayFeature,
  RailwayFeatureCollection,
  RailwaySegmentProperties,
  RailwaySummary,
  StationFeatureCollection
} from "../types/railway";

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
    electrification: Array.from(counts, ([name, count]) => ({
      name: electrificationLabel(name),
      count
    }))
  };
}

export function selectedChunkPropertiesToFeatures(
  chunks: RailwayChunkProperties[]
): RailwayChunkFeature[] {
  return chunks
    .filter((chunk) => chunk.geometry?.type === "LineString")
    .map((chunk) => ({
      type: "Feature",
      id: chunk.id,
      geometry: chunk.geometry!,
      properties: chunk
    }));
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

export function findFeatureBySelection(
  segments: RailwayFeatureCollection,
  selection: RailwaySegmentProperties | null
): RailwayFeature | null {
  if (!selection) {
    return null;
  }

  const feature = findSectionFeature(segments, selection);
  return feature ?? findFeatureById(segments, selection.id);
}

export function formatLength(value: RailwaySegmentProperties["length_m"]): string {
  const meters = Number(value);
  if (!Number.isFinite(meters) || meters <= 0) {
    return "н/д";
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} км`;
  }
  return `${Math.round(meters).toLocaleString("ru-RU")} м`;
}

export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "н/д";
  }
  return String(value);
}

function findSectionFeature(
  segments: RailwayFeatureCollection,
  selection: RailwaySegmentProperties
): RailwayFeature | null {
  if (hasSectionOffsets(selection)) {
    const feature = segments.features.find(
      (item) =>
        String(item.properties.id) === String(selection.id) &&
        Number(item.properties.section_start_offset_m) === Number(selection.section_start_offset_m) &&
        Number(item.properties.section_end_offset_m) === Number(selection.section_end_offset_m)
    );
    if (feature) {
      return feature;
    }
  }

  if (selection.section_id === null || selection.section_id === undefined) {
    return null;
  }

  return (
    segments.features.find(
      (item) =>
        String(item.properties.id) === String(selection.id) &&
        String(item.properties.section_id) === String(selection.section_id)
    ) ?? null
  );
}

function hasSectionOffsets(selection: RailwaySegmentProperties): boolean {
  return (
    selection.section_start_offset_m !== null &&
    selection.section_start_offset_m !== undefined &&
    selection.section_end_offset_m !== null &&
    selection.section_end_offset_m !== undefined
  );
}

function electrificationLabel(value: string): string {
  switch (value) {
    case "contact_line":
      return "Контактная сеть";
    case "partial":
      return "Частично";
    case "no":
      return "Нет";
    case "unknown":
      return "Неизвестно";
    default:
      return value;
  }
}
