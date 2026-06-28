import { useQuery } from "@tanstack/react-query";
import { demoRailwayData } from "../features/map/demoData";
import { fetchRailwayData, loadCachedRailwayData } from "../services/railwayApi";

export function useRailwayData() {
  const cacheQuery = useQuery({
    queryKey: ["railway-data-cache"],
    queryFn: loadCachedRailwayData,
    staleTime: Infinity,
    gcTime: Infinity
  });
  const query = useQuery({
    queryKey: ["railway-data", "initial-50km"],
    queryFn: fetchRailwayData,
    staleTime: 5 * 60_000,
    placeholderData: (previousData) => previousData
  });
  const cachedData = cacheQuery.data ?? null;
  const railwayData = query.data ?? cachedData ?? demoRailwayData;

  return {
    ...query,
    railwayData,
    isFallback: !query.data && !cachedData,
    isLoading: query.isLoading && !cachedData,
    apiError: query.error
  };
}
