import type { StyleSpecification } from "maplibre-gl";

const OSM_TILE_PROBE_URL = "https://tile.openstreetmap.org/0/0/0.png";
const TILE_PROBE_TIMEOUT_MS = 2_500;

export const osmRasterMapStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors"
    }
  },
  layers: [
    {
      id: "osm-base",
      type: "raster",
      source: "osm"
    }
  ]
};

export const localRussiaMapStyle: StyleSpecification = {
  version: 8,
  sources: {
    "russia-extent": {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [19.6, 54.4],
                  [28.2, 69.5],
                  [47.0, 80.2],
                  [79.0, 81.8],
                  [112.0, 77.8],
                  [143.0, 73.0],
                  [169.0, 66.0],
                  [179.5, 61.0],
                  [164.0, 50.0],
                  [135.0, 43.0],
                  [110.0, 49.0],
                  [89.0, 49.2],
                  [60.0, 50.0],
                  [40.0, 45.0],
                  [28.0, 46.0],
                  [19.6, 54.4]
                ]
              ]
            }
          }
        ]
      }
    }
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#eef2ee"
      }
    },
    {
      id: "russia-fill",
      type: "fill",
      source: "russia-extent",
      paint: {
        "fill-color": "#f8faf7",
        "fill-opacity": 0.96
      }
    },
    {
      id: "russia-outline",
      type: "line",
      source: "russia-extent",
      paint: {
        "line-color": "#9da79d",
        "line-width": 1,
        "line-opacity": 0.85
      }
    }
  ]
};

let baseMapStylePromise: Promise<StyleSpecification> | null = null;

export function resolveBaseMapStyle(): Promise<StyleSpecification> {
  baseMapStylePromise ??= canLoadOsmTiles().then((canLoad) =>
    cloneStyle(canLoad ? osmRasterMapStyle : localRussiaMapStyle)
  );
  return baseMapStylePromise;
}

function canLoadOsmTiles(): Promise<boolean> {
  if (typeof window === "undefined" || typeof Image === "undefined") {
    return Promise.resolve(false);
  }
  if ("onLine" in navigator && !navigator.onLine) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve(false);
    }, TILE_PROBE_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
    };

    image.onload = () => {
      cleanup();
      resolve(true);
    };
    image.onerror = () => {
      cleanup();
      resolve(false);
    };
    image.referrerPolicy = "no-referrer";
    image.src = `${OSM_TILE_PROBE_URL}?probe=${Date.now()}`;
  });
}

function cloneStyle(style: StyleSpecification): StyleSpecification {
  return JSON.parse(JSON.stringify(style)) as StyleSpecification;
}
