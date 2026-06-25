import { useQuery } from "@tanstack/react-query";
import { demoRailwayData } from "../features/map/demoData";
import { fetchRailwayData } from "../services/railwayApi";

export function useRailwayData() {
  const query = useQuery({
    queryKey: ["railway-data"],
    queryFn: fetchRailwayData,
    staleTime: 60_000
  });

  return {
    ...query,
    railwayData: query.data ?? demoRailwayData,
    isFallback: !query.data,
    apiError: query.error
  };
}
