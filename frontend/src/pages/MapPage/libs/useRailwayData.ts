import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { demoRailwayData } from "../../../features/map/demoData";
import {
	emptyStationCollection,
	fetchRailwayData,
	loadCachedRailwayData,
} from "../../../services/railwayApi";
import { buildRailwaySummary } from "../../../libs/railway";
import type { RailwayMapViewport } from "../../../types/railway";

const railwayCacheQueryKey = ["railway-data-cache"] as const;

export function useRailwayData(viewport: RailwayMapViewport | null) {
	const queryClient = useQueryClient();
	const initialFetchStartedRef = useRef(false);
	const cacheQuery = useQuery({
		queryKey: railwayCacheQueryKey,
		queryFn: loadCachedRailwayData,
		staleTime: Infinity,
		gcTime: Infinity,
	});

	const query = useQuery({
		queryKey: ["railway-data", "manual-viewport"],
		queryFn: ({ signal }) => fetchRailwayData(viewport!, signal),
		enabled: false,
		staleTime: 5 * 60_000,
		gcTime: 30 * 60_000,
		placeholderData: (previousData) => previousData,
	});
	const refetchRailwayData = query.refetch;

	useEffect(() => {
		if (query.data) {
			queryClient.setQueryData(railwayCacheQueryKey, query.data);
		}
	}, [query.data, queryClient]);

	useEffect(() => {
		if (
			!viewport ||
			!cacheQuery.isSuccess ||
			cacheQuery.data !== null ||
			initialFetchStartedRef.current
		) {
			return;
		}

		initialFetchStartedRef.current = true;
		void refetchRailwayData();
	}, [cacheQuery.data, cacheQuery.isSuccess, refetchRailwayData, viewport]);

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
		isLoading: query.isFetching,
		isRoadLoading: query.isFetching,
		apiError: query.error,
	};
}
