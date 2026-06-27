import { useEffect, useMemo, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { resolveBaseMapStyle } from "../map/baseStyle";
import {
  RAILWAY_HIT_LAYER_ID,
  RAILWAY_CHUNK_GUIDE_LAYER_ID,
  RAILWAY_CHUNK_HIT_LAYER_ID,
  RAILWAY_CHUNK_SOURCE_ID,
  RAILWAY_LINE_LAYER_ID,
  RAILWAY_SELECTED_LAYER_ID,
  RAILWAY_SELECTED_CHUNKS_LAYER_ID,
  RAILWAY_SOURCE_ID,
  DEFECT_LAYER_ID,
  DEFECT_SOURCE_ID,
  EVENT_LAYER_ID,
  EVENT_SOURCE_ID,
  SELECTED_SOURCE_ID,
  SELECTED_CHUNKS_SOURCE_ID,
  STATION_LAYER_ID,
  STATION_SOURCE_ID
} from "../map/layers";
import type {
  RailwayChunkFeature,
  RailwayChunkProperties,
  RailwayData,
  RailwayFeature,
  RailwaySegmentProperties
} from "../types/railway";
import type { LayerKey } from "../store/mapStore";
import {
  findFeatureById,
  findFeatureBySelection,
  formatLength,
  selectedChunkPropertiesToFeatures
} from "../libs/railway";
import type { AdminMapData } from "../types/admin";

type MapCanvasProps = {
  data: RailwayData;
  adminData: AdminMapData;
  visibleLayers: Record<LayerKey, boolean>;
  selectedSegment: RailwaySegmentProperties | null;
  selectedChunks: RailwayChunkProperties[];
  onSelectSegment: (segment: RailwaySegmentProperties | null) => void;
  onToggleChunk: (chunk: RailwayChunkProperties) => void;
  onClearChunks: () => void;
};

const emptyFeatureCollection = {
  type: "FeatureCollection",
  features: []
} satisfies GeoJSON.FeatureCollection;

export function MapCanvas({
  data,
  adminData,
  visibleLayers,
  selectedSegment,
  selectedChunks,
  onSelectSegment,
  onToggleChunk,
  onClearChunks
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const selectedFeature = useMemo(
    () => findFeatureBySelection(data.segments, selectedSegment),
    [data.segments, selectedSegment]
  );
  const selectedChunkFeatures = useMemo(
    () => selectedChunkPropertiesToFeatures(selectedChunks),
    [selectedChunks]
  );
  const latestStateRef = useRef({
    data,
    adminData,
    selectedFeature,
    selectedChunkFeatures,
    selectedChunks,
    visibleLayers
  });

  useEffect(() => {
    latestStateRef.current = {
      data,
      adminData,
      selectedFeature,
      selectedChunkFeatures,
      selectedChunks,
      visibleLayers
    };
  }, [data, adminData, selectedFeature, selectedChunkFeatures, selectedChunks, visibleLayers]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    let disposed = false;

    void resolveBaseMapStyle().then((style) => {
      if (disposed || !containerRef.current || mapRef.current) {
        return;
      }

      const map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [92, 58],
        zoom: 3.1,
        minZoom: 2,
        maxZoom: 13,
        renderWorldCopies: false,
        maxBounds: [
          [18, 40],
          [180, 83]
        ]
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
      mapRef.current = map;

      map.on("load", () => {
        const latest = latestStateRef.current;
        ensureRailwayLayers(map);
        updateRailwaySources(map, latest.data);
        updateAdminSources(map, latest.adminData);
        updateSelectionSources(map, latest.selectedFeature, latest.selectedChunkFeatures);
        updateLayerVisibility(map, latest.visibleLayers);
      });

      map.on("click", (event) => {
        const chunkFeatures = map.queryRenderedFeatures(event.point, {
          layers: [RAILWAY_CHUNK_HIT_LAYER_ID]
        });
        const chunkFeature = chunkFeatures[0] as unknown as RailwayChunkFeature | undefined;
        if (chunkFeature) {
          const parentSegment =
            latestStateRef.current.selectedFeature ??
            findFeatureById(
              latestStateRef.current.data.segments,
              chunkFeature.properties.segment_id
            );
          const nextChunks = toggleChunk(latestStateRef.current.selectedChunks, {
            ...chunkFeature.properties,
            geometry: chunkFeature.geometry
          });
          updateSelectedChunksSource(map, selectedChunkPropertiesToFeatures(nextChunks));
          onSelectSegment(parentSegment?.properties ?? null);
          onToggleChunk({ ...chunkFeature.properties, geometry: chunkFeature.geometry });
          return;
        }

        const features = map.queryRenderedFeatures(event.point, { layers: [RAILWAY_HIT_LAYER_ID] });
        const railwayFeature = features[0] as unknown as RailwayFeature | undefined;
        updateSelectedRailwaySource(map, railwayFeature ?? null);
        if (!railwayFeature) {
          onClearChunks();
          updateSelectedChunksSource(map, []);
        }
        onSelectSegment(railwayFeature?.properties ?? null);
      });

      map.on("mousemove", RAILWAY_HIT_LAYER_ID, (event) => {
        map.getCanvas().style.cursor = "pointer";
        const feature = map.queryRenderedFeatures(event.point, {
          layers: [RAILWAY_HIT_LAYER_ID]
        })[0] as unknown as RailwayFeature | undefined;
        if (!feature || !popupRef.current) {
          return;
        }

        popupRef.current
          .setLngLat(event.lngLat)
          .setHTML(
            `<strong>${feature.properties.name ?? "Участок железной дороги"}</strong><br/>` +
              `Ветка: ${feature.properties.branch ?? "н/д"}<br/>` +
              `Длина: ${formatLength(feature.properties.length_m)}`
          )
          .addTo(map);
      });

      map.on("mouseleave", RAILWAY_HIT_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });
    });

    return () => {
      disposed = true;
      popupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }
    ensureRailwayLayers(map);
    updateBaseRailwaySource(map, data);
  }, [data.segments, data.stations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }
    ensureRailwayLayers(map);
    updateChunkSource(map, data);
  }, [data.chunks]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }
    ensureRailwayLayers(map);
    updateAdminSources(map, adminData);
  }, [adminData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }
    ensureRailwayLayers(map);
    updateSelectionSources(map, selectedFeature, selectedChunkFeatures);
  }, [selectedFeature, selectedChunkFeatures]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }
    updateLayerVisibility(map, visibleLayers);
  }, [visibleLayers]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function ensureRailwayLayers(map: MapLibreMap) {
  if (!map.getSource(RAILWAY_SOURCE_ID)) {
    map.addSource(RAILWAY_SOURCE_ID, {
      type: "geojson",
      data: emptyFeatureCollection
    });
  }

  if (!map.getSource(RAILWAY_CHUNK_SOURCE_ID)) {
    map.addSource(RAILWAY_CHUNK_SOURCE_ID, {
      type: "geojson",
      data: emptyFeatureCollection
    });
  }

  if (!map.getSource(STATION_SOURCE_ID)) {
    map.addSource(STATION_SOURCE_ID, {
      type: "geojson",
      data: emptyFeatureCollection
    });
  }

  if (!map.getSource(SELECTED_SOURCE_ID)) {
    map.addSource(SELECTED_SOURCE_ID, {
      type: "geojson",
      data: emptyFeatureCollection
    });
  }

  if (!map.getSource(SELECTED_CHUNKS_SOURCE_ID)) {
    map.addSource(SELECTED_CHUNKS_SOURCE_ID, {
      type: "geojson",
      data: emptyFeatureCollection
    });
  }

  if (!map.getSource(EVENT_SOURCE_ID)) {
    map.addSource(EVENT_SOURCE_ID, {
      type: "geojson",
      data: emptyFeatureCollection
    });
  }

  if (!map.getSource(DEFECT_SOURCE_ID)) {
    map.addSource(DEFECT_SOURCE_ID, {
      type: "geojson",
      data: emptyFeatureCollection
    });
  }

  if (!map.getLayer(RAILWAY_LINE_LAYER_ID)) {
    map.addLayer({
      id: RAILWAY_LINE_LAYER_ID,
      type: "line",
      source: RAILWAY_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": [
          "match",
          ["get", "electrified"],
          "contact_line",
          "#177a4b",
          "partial",
          "#bd5a18",
          "#c93535"
        ],
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.4, 8, 4.2],
        "line-opacity": 0.9
      }
    });
  }

  if (!map.getLayer(RAILWAY_SELECTED_LAYER_ID)) {
    map.addLayer({
      id: RAILWAY_SELECTED_LAYER_ID,
      type: "line",
      source: SELECTED_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#101312",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3, 8, 7],
        "line-opacity": 0.95
      }
    });
  }

  if (!map.getLayer(RAILWAY_CHUNK_GUIDE_LAYER_ID)) {
    map.addLayer({
      id: RAILWAY_CHUNK_GUIDE_LAYER_ID,
      type: "line",
      source: RAILWAY_CHUNK_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#2563eb",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2, 8, 4],
        "line-opacity": 0.34
      }
    });
  }

  if (!map.getLayer(RAILWAY_SELECTED_CHUNKS_LAYER_ID)) {
    map.addLayer({
      id: RAILWAY_SELECTED_CHUNKS_LAYER_ID,
      type: "line",
      source: SELECTED_CHUNKS_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#2563eb",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 5, 8, 10],
        "line-opacity": 0.96
      }
    });
  }

  if (!map.getLayer(RAILWAY_CHUNK_HIT_LAYER_ID)) {
    map.addLayer({
      id: RAILWAY_CHUNK_HIT_LAYER_ID,
      type: "line",
      source: RAILWAY_CHUNK_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#000000",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 18, 8, 26],
        "line-opacity": 0
      }
    });
  }

  if (!map.getLayer(RAILWAY_HIT_LAYER_ID)) {
    map.addLayer({
      id: RAILWAY_HIT_LAYER_ID,
      type: "line",
      source: RAILWAY_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#000000",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 14, 8, 22],
        "line-opacity": 0
      }
    });
  }

  if (!map.getLayer(EVENT_LAYER_ID)) {
    map.addLayer({
      id: EVENT_LAYER_ID,
      type: "line",
      source: EVENT_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": ["coalesce", ["get", "event_type_color"], "#eab308"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 4, 8, 9],
        "line-opacity": 0.78
      }
    });
  }

  if (!map.getLayer(DEFECT_LAYER_ID)) {
    map.addLayer({
      id: DEFECT_LAYER_ID,
      type: "circle",
      source: DEFECT_SOURCE_ID,
      paint: {
        "circle-color": "#c93535",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 5, 8, 10]
      }
    });
  }

  if (!map.getLayer(STATION_LAYER_ID)) {
    map.addLayer({
      id: STATION_LAYER_ID,
      type: "circle",
      source: STATION_SOURCE_ID,
      paint: {
        "circle-color": "#fafafa",
        "circle-stroke-color": "#1f2522",
        "circle-stroke-width": 1.2,
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 3, 8, 7]
      }
    });
  }
}

function updateRailwaySources(map: MapLibreMap, data: RailwayData) {
  updateBaseRailwaySource(map, data);
  updateChunkSource(map, data);
}

function updateBaseRailwaySource(map: MapLibreMap, data: RailwayData) {
  const railwaySource = map.getSource(RAILWAY_SOURCE_ID) as GeoJSONSource;
  railwaySource.setData(data.segments as unknown as GeoJSON.FeatureCollection);

  const stationSource = map.getSource(STATION_SOURCE_ID) as GeoJSONSource;
  stationSource.setData(data.stations as unknown as GeoJSON.FeatureCollection);
}

function updateChunkSource(map: MapLibreMap, data: RailwayData) {
  const chunkSource = map.getSource(RAILWAY_CHUNK_SOURCE_ID) as GeoJSONSource;
  chunkSource.setData(data.chunks as unknown as GeoJSON.FeatureCollection);
}

function updateSelectionSources(
  map: MapLibreMap,
  selectedFeature: RailwayFeature | null,
  selectedChunkFeatures: RailwayChunkFeature[]
) {
  updateSelectedRailwaySource(map, selectedFeature);
  updateSelectedChunksSource(map, selectedChunkFeatures);
}

function updateSelectedRailwaySource(map: MapLibreMap, selectedFeature: RailwayFeature | null) {
  const selectedSource = map.getSource(SELECTED_SOURCE_ID) as GeoJSONSource;
  selectedSource.setData(
    selectedFeature
      ? ({ type: "FeatureCollection", features: [selectedFeature] } as GeoJSON.FeatureCollection)
      : emptyFeatureCollection
  );
}

function updateSelectedChunksSource(map: MapLibreMap, selectedChunkFeatures: RailwayChunkFeature[]) {
  const selectedChunksSource = map.getSource(SELECTED_CHUNKS_SOURCE_ID) as GeoJSONSource;
  selectedChunksSource.setData({
    type: "FeatureCollection",
    features: selectedChunkFeatures
  } as unknown as GeoJSON.FeatureCollection);
}

function updateAdminSources(map: MapLibreMap, adminData: AdminMapData) {
  const eventSource = map.getSource(EVENT_SOURCE_ID) as GeoJSONSource;
  eventSource.setData(adminData.events as unknown as GeoJSON.FeatureCollection);

  const defectSource = map.getSource(DEFECT_SOURCE_ID) as GeoJSONSource;
  defectSource.setData(adminData.defects as unknown as GeoJSON.FeatureCollection);
}

function toggleChunk(
  chunks: RailwayChunkProperties[],
  chunk: RailwayChunkProperties
): RailwayChunkProperties[] {
  const exists = chunks.some((item) => String(item.id) === String(chunk.id));
  return exists
    ? chunks.filter((item) => String(item.id) !== String(chunk.id))
    : [...chunks, chunk];
}

function updateLayerVisibility(map: MapLibreMap, visibleLayers: Record<LayerKey, boolean>) {
  setVisibility(map, RAILWAY_LINE_LAYER_ID, visibleLayers.railways);
  setVisibility(map, RAILWAY_HIT_LAYER_ID, visibleLayers.railways);
  setVisibility(map, RAILWAY_CHUNK_GUIDE_LAYER_ID, visibleLayers.railways);
  setVisibility(map, RAILWAY_CHUNK_HIT_LAYER_ID, visibleLayers.railways);
  setVisibility(map, RAILWAY_SELECTED_LAYER_ID, visibleLayers.railways);
  setVisibility(map, RAILWAY_SELECTED_CHUNKS_LAYER_ID, visibleLayers.railways);
  setVisibility(map, STATION_LAYER_ID, visibleLayers.stations);
  setVisibility(map, EVENT_LAYER_ID, visibleLayers.events);
  setVisibility(map, DEFECT_LAYER_ID, visibleLayers.defects);

  if (map.getLayer(RAILWAY_LINE_LAYER_ID)) {
    map.setPaintProperty(
      RAILWAY_LINE_LAYER_ID,
      "line-color",
      visibleLayers.electrification
        ? [
            "match",
            ["get", "electrified"],
            "contact_line",
            "#177a4b",
            "partial",
            "#bd5a18",
            "#c93535"
          ]
        : "#c93535"
    );
  }
}

function setVisibility(map: MapLibreMap, layerId: string, visible: boolean) {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }
}
