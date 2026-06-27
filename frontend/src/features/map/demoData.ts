import type { RailwayData, RailwayFeatureCollection, StationFeatureCollection } from "../../types/railway";
import { buildRailwaySummary } from "../../libs/railway";

const demoSegments: RailwayFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: 1,
      geometry: {
        type: "LineString",
        coordinates: [
          [37.62, 55.75],
          [49.12, 55.79],
          [60.61, 56.84],
          [82.93, 55.03],
          [104.3, 52.29],
          [131.88, 43.12]
        ]
      },
      properties: {
        id: 1,
        osm_id: 1001,
        name: "Транссибирская магистраль",
        branch: "Главный ход",
        operator: "РЖД",
        gauge: 1520,
        electrified: "contact_line",
        voltage: 25000,
        frequency: 50,
        usage: "main",
        railway_type: "rail",
        passenger_lines: 2,
        length_m: 9288000
      }
    },
    {
      type: "Feature",
      id: 2,
      geometry: {
        type: "LineString",
        coordinates: [
          [104.3, 52.29],
          [113.5, 52.03],
          [125.35, 58.6],
          [136.9, 50.55]
        ]
      },
      properties: {
        id: 2,
        osm_id: 1002,
        name: "Байкало-Амурская магистраль",
        branch: "БАМ",
        operator: "РЖД",
        gauge: 1520,
        electrified: "partial",
        voltage: 25000,
        frequency: 50,
        usage: "main",
        railway_type: "rail",
        passenger_lines: 1,
        length_m: 4300000
      }
    },
    {
      type: "Feature",
      id: 3,
      geometry: {
        type: "LineString",
        coordinates: [
          [30.31, 59.94],
          [37.62, 55.75],
          [39.7, 47.24]
        ]
      },
      properties: {
        id: 3,
        osm_id: 1003,
        name: "Коридор Северо-Запад - Юг",
        branch: "Демо",
        operator: "РЖД",
        gauge: 1520,
        electrified: "contact_line",
        voltage: 3000,
        frequency: 0,
        usage: "main",
        railway_type: "rail",
        passenger_lines: 2,
        length_m: 1840000
      }
    }
  ]
};

const demoStations: StationFeatureCollection = {
  type: "FeatureCollection",
  features: [
    station(1, "Москва", [37.62, 55.75]),
    station(2, "Екатеринбург", [60.61, 56.84]),
    station(3, "Новосибирск", [82.93, 55.03]),
    station(4, "Иркутск", [104.3, 52.29]),
    station(5, "Владивосток", [131.88, 43.12])
  ]
};

export const demoRailwayData: RailwayData = {
  segments: demoSegments,
  chunks: {
    type: "FeatureCollection",
    features: demoSegments.features.map((feature) => ({
      type: "Feature",
      id: `demo-${feature.id}`,
      geometry: feature.geometry,
      properties: {
        id: `demo-${feature.id}`,
        segment_id: feature.properties.id,
        chunk_index: 0,
        start_offset_m: 0,
        end_offset_m: feature.properties.length_m ?? 0,
        length_m: feature.properties.length_m ?? 0
      }
    }))
  },
  stations: demoStations,
  summary: buildRailwaySummary(demoSegments, demoStations)
};

function station(id: number, name: string, coordinates: [number, number]) {
  return {
    type: "Feature" as const,
    id,
    geometry: {
      type: "Point" as const,
      coordinates
    },
    properties: {
      id,
      osm_id: 2000 + id,
      name,
      esr_code: null
    }
  };
}
