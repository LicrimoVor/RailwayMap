import { useEffect, useMemo, useRef } from "react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { resolveBaseMapStyle } from "../../../../map/baseStyle";
import { selectedChunkPropertiesToFeatures, findFeatureBySelection } from "../../../../libs/railway";
import type { MapCanvasProps } from "../../model/types";
import { emitViewportChange } from "../../libs/mapHelpers";
import { setupMapInteractions } from "./interactions";
import { ensureRailwayLayers } from "./layers";
import {
  updateAdminSources,
  updateBaseRailwaySource,
  updateChunkSource,
  updateSelectionSources
} from "./sources";
import type { MapStateSnapshot } from "./types";
import { updateLayerVisibility } from "./visibility";

export function MapCanvas({
  data,
  adminData,
  visibleLayers,
  selectedSegment,
  selectedChunks,
  onViewportChange,
  onSelectSegment,
  onToggleChunk,
  onClearChunks
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onViewportChangeRef = useRef(onViewportChange);
  const callbacksRef = useRef({ onSelectSegment, onToggleChunk, onClearChunks });

  const selectedFeature = useMemo(
    () => findFeatureBySelection(data.segments, selectedSegment),
    [data.segments, selectedSegment]
  );
  const selectedChunkFeatures = useMemo(
    () => selectedChunkPropertiesToFeatures(selectedChunks),
    [selectedChunks]
  );
  const latestStateRef = useRef<MapStateSnapshot>({
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
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    callbacksRef.current = { onSelectSegment, onToggleChunk, onClearChunks };
  }, [onSelectSegment, onToggleChunk, onClearChunks]);

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
        maxZoom: 18,
        renderWorldCopies: false,
        maxBounds: [
          [18, 40],
          [180, 83]
        ]
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
      mapRef.current = map;

      setupMapInteractions({
        map,
        popupRef,
        latestStateRef,
        onViewportChangeRef,
        callbacksRef
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
    const map = readyMap(mapRef.current);
    if (!map) {
      return;
    }
    updateBaseRailwaySource(map, data);
  }, [data.segments, data.stations]);

  useEffect(() => {
    const map = readyMap(mapRef.current);
    if (!map) {
      return;
    }
    updateChunkSource(map, data);
  }, [data.chunks]);

  useEffect(() => {
    const map = readyMap(mapRef.current);
    if (!map) {
      return;
    }
    updateAdminSources(map, adminData);
  }, [adminData]);

  useEffect(() => {
    const map = readyMap(mapRef.current);
    if (!map) {
      return;
    }
    updateSelectionSources(map, selectedFeature, selectedChunkFeatures);
  }, [selectedFeature, selectedChunkFeatures]);

  useEffect(() => {
    const map = readyMap(mapRef.current);
    if (!map) {
      return;
    }
    updateLayerVisibility(map, visibleLayers);
  }, [visibleLayers]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function readyMap(map: MapLibreMap | null): MapLibreMap | null {
  if (!map || !map.isStyleLoaded()) {
    return null;
  }
  ensureRailwayLayers(map);
  return map;
}
