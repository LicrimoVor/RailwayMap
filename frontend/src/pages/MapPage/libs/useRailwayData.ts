import { useQuery } from "@tanstack/react-query";
import { demoRailwayData } from "../../../features/map/demoData";
import {
	emptyStationCollection,
	fetchRailwayData,
	loadCachedRailwayData,
} from "../../../services/railwayApi";
import { buildRailwaySummary } from "../../../libs/railway";

export function useRailwayData() {
	const cacheQuery = useQuery({
		queryKey: ["railway-data-cache"],
		queryFn: loadCachedRailwayData,
		staleTime: Infinity,
		gcTime: Infinity,
	});

	const query = useQuery({
		queryKey: ["railway-data", "initial-10km"],
		queryFn: fetchRailwayData,
		staleTime: 5 * 60_000,
		placeholderData: (previousData) => previousData,
	});
	const cachedData = cacheQuery.data ?? null;
	const baseData = query.data ?? cachedData ?? demoRailwayData;
	const railwayData = {
		...baseData,
		stations: emptyStationCollection,
		summary: buildRailwaySummary(baseData.segments, emptyStationCollection),
	};

	return {
		...query,
		railwayData,
		isFallback: !query.data && !cachedData,
		isLoading: query.isLoading && !cachedData,
		isRoadLoading: query.isLoading && !cachedData,
		apiError: query.error,
	};
}
