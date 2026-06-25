import type { RailwayData, RailwayFeatureCollection, StationFeatureCollection } from "../../types/railway";
import { buildRailwaySummary } from "./utils";

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
        name: "Trans-Siberian Railway",
        branch: "Main",
        operator: "RZD",
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
        name: "Baikal-Amur Mainline",
        branch: "BAM",
        operator: "RZD",
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
        name: "North-West to South Corridor",
        branch: "Demo",
        operator: "RZD",
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
    station(1, "Moscow", [37.62, 55.75]),
    station(2, "Yekaterinburg", [60.61, 56.84]),
    station(3, "Novosibirsk", [82.93, 55.03]),
    station(4, "Irkutsk", [104.3, 52.29]),
    station(5, "Vladivostok", [131.88, 43.12])
  ]
};

export const demoRailwayData: RailwayData = {
  segments: demoSegments,
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
