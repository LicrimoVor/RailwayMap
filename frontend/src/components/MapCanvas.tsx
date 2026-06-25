import { useEffect, useMemo, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { baseMapStyle } from "../map/baseStyle";
import {
  RAILWAY_HIT_LAYER_ID,
  RAILWAY_LINE_LAYER_ID,
  RAILWAY_SELECTED_LAYER_ID,
  RAILWAY_SOURCE_ID,
  SELECTED_SOURCE_ID,
  STATION_LAYER_ID,
  STATION_SOURCE_ID
} from "../map/layers";
import type { RailwayData, RailwayFeature, RailwaySegmentProperties } from "../types/railway";
import type { LayerKey } from "../store/mapStore";
import { findFeatureById, formatLength } from "../features/map/utils";

type MapCanvasProps = {
  data: RailwayData;
  visibleLayers: Record<LayerKey, boolean>;
  selectedSegment: RailwaySegmentProperties | null;
  onSelectSegment: (segment: RailwaySegmentProperties | null) => void;
};

const emptyFeatureCollection = {
  type: "FeatureCollection",
  features: []
} satisfies GeoJSON.FeatureCollection;

export function MapCanvas({
  data,
  visibleLayers,
  selectedSegment,
  onSelectSegment
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const selectedFeature = useMemo(
    () => findFeatureById(data.segments, selectedSegment?.id ?? null),
    [data.segments, selectedSegment?.id]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: baseMapStyle,
      center: [92, 58],
      zoom: 3.1,
      minZoom: 2,
      maxZoom: 13
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
    mapRef.current = map;

    map.on("load", () => {
      ensureRailwayLayers(map);
      updateRailwayData(map, data, selectedFeature);
      updateLayerVisibility(map, visibleLayers);
    });

    map.on("click", (event) => {
      const features = map.queryRenderedFeatures(event.point, { layers: [RAILWAY_HIT_LAYER_ID] });
      const railwayFeature = features[0] as unknown as RailwayFeature | undefined;
      onSelectSegment(railwayFeature?.properties ?? null);
    });

    map.on("mousemove", RAILWAY_HIT_LAYER_ID, (event) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = map.queryRenderedFeatures(event.point, { layers: [RAILWAY_HIT_LAYER_ID] })[0] as
        | unknown as RailwayFeature
        | undefined;
      if (!feature || !popupRef.current) {
        return;
      }

      popupRef.current
        .setLngLat(event.lngLat)
        .setHTML(
          `<strong>${feature.properties.name ?? "Railway segment"}</strong><br/>` +
            `Branch: ${feature.properties.branch ?? "n/a"}<br/>` +
            `Length: ${formatLength(feature.properties.length_m)}`
        )
        .addTo(map);
    });

    map.on("mouseleave", RAILWAY_HIT_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
      popupRef.current?.remove();
    });

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }
    ensureRailwayLayers(map);
    updateRailwayData(map, data, selectedFeature);
  }, [data, selectedFeature]);

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

  if (!map.getLayer(RAILWAY_LINE_LAYER_ID)) {
    map.addLayer({
      id: RAILWAY_LINE_LAYER_ID,
      type: "line",
      source: RAILWAY_SOURCE_ID,
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
      paint: {
        "line-color": "#101312",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3, 8, 7],
        "line-opacity": 0.95
      }
    });
  }

  if (!map.getLayer(RAILWAY_HIT_LAYER_ID)) {
    map.addLayer({
      id: RAILWAY_HIT_LAYER_ID,
      type: "line",
      source: RAILWAY_SOURCE_ID,
      paint: {
        "line-color": "#000000",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 14, 8, 22],
        "line-opacity": 0
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

function updateRailwayData(
  map: MapLibreMap,
  data: RailwayData,
  selectedFeature: RailwayFeature | null
) {
  const railwaySource = map.getSource(RAILWAY_SOURCE_ID) as GeoJSONSource;
  railwaySource.setData(data.segments as unknown as GeoJSON.FeatureCollection);

  const stationSource = map.getSource(STATION_SOURCE_ID) as GeoJSONSource;
  stationSource.setData(data.stations as unknown as GeoJSON.FeatureCollection);

  const selectedSource = map.getSource(SELECTED_SOURCE_ID) as GeoJSONSource;
  selectedSource.setData(
    selectedFeature
      ? ({ type: "FeatureCollection", features: [selectedFeature] } as GeoJSON.FeatureCollection)
      : emptyFeatureCollection
  );
}

function updateLayerVisibility(map: MapLibreMap, visibleLayers: Record<LayerKey, boolean>) {
  setVisibility(map, RAILWAY_LINE_LAYER_ID, visibleLayers.railways);
  setVisibility(map, RAILWAY_HIT_LAYER_ID, visibleLayers.railways);
  setVisibility(map, RAILWAY_SELECTED_LAYER_ID, visibleLayers.railways);
  setVisibility(map, STATION_LAYER_ID, visibleLayers.stations);

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
