import { useQuery } from "@tanstack/react-query";
import { demoRailwayData } from "../features/map/demoData";
import {
  emptyStationCollection,
  fetchRailwayData,
  fetchStations,
  loadCachedRailwayData,
  loadCachedStations
} from "../services/railwayApi";
import { buildRailwaySummary } from "../libs/railway";

export function useRailwayData(loadStations: boolean) {
  const cacheQuery = useQuery({
    queryKey: ["railway-data-cache"],
    queryFn: loadCachedRailwayData,
    staleTime: Infinity,
    gcTime: Infinity
  });
  const query = useQuery({
    queryKey: ["railway-data", "initial-10km"],
    queryFn: fetchRailwayData,
    staleTime: 5 * 60_000,
    placeholderData: (previousData) => previousData
  });
  const stationCacheQuery = useQuery({
    queryKey: ["railway-stations-cache"],
    queryFn: loadCachedStations,
    enabled: loadStations,
    staleTime: Infinity,
    gcTime: Infinity
  });
  const stationQuery = useQuery({
    queryKey: ["railway-stations"],
    queryFn: fetchStations,
    enabled: loadStations,
    staleTime: 5 * 60_000,
    placeholderData: (previousData) => previousData
  });
  const cachedData = cacheQuery.data ?? null;
  const baseData = query.data ?? cachedData ?? demoRailwayData;
  const stations = loadStations
    ? stationQuery.data ?? stationCacheQuery.data ?? baseData.stations ?? emptyStationCollection
    : emptyStationCollection;
  const railwayData = {
    ...baseData,
    stations,
    summary: buildRailwaySummary(baseData.segments, stations)
  };

  return {
    ...query,
    railwayData,
    isFallback: !query.data && !cachedData,
    isLoading: query.isLoading && !cachedData,
    isRoadLoading: query.isLoading && !cachedData,
    isStationLoading: loadStations && stationQuery.isLoading && !stationCacheQuery.data,
    apiError: query.error ?? (loadStations ? stationQuery.error : null)
  };
}
