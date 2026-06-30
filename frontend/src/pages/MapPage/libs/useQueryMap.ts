import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	fetchDefectsForViewport,
	loadCachedDefects,
} from "../../../services/adminApi";
import {
	fetchStationsForViewport,
	loadCachedStations,
} from "../../../services/railwayApi";
import type { RailwayMapViewport } from "../../../types/railway";

const stationCacheQueryKey = ["railway-stations-cache"] as const;
const defectCacheQueryKey = ["admin-map-defects-cache"] as const;

export const useQueryMap = (viewport: RailwayMapViewport | null) => {
	const queryClient = useQueryClient();
	const stationInitialFetchStartedRef = useRef(false);
	const defectInitialFetchStartedRef = useRef(false);

	const stationCacheQuery = useQuery({
		queryKey: stationCacheQueryKey,
		queryFn: loadCachedStations,
		staleTime: Infinity,
		gcTime: Infinity,
	});
	const defectCacheQuery = useQuery({
		queryKey: defectCacheQueryKey,
		queryFn: loadCachedDefects,
		staleTime: Infinity,
		gcTime: Infinity,
	});

	const stationQuery = useQuery({
		queryKey: ["railway-stations", "manual-viewport"],
		queryFn: ({ signal }) => fetchStationsForViewport(viewport!, signal),
		enabled: false,
		staleTime: 10 * 60_000,
		gcTime: 30 * 60_000,
		placeholderData: (previousData) => previousData,
	});
	const refetchStations = stationQuery.refetch;
	const defectQuery = useQuery({
		queryKey: ["admin-map-defects", "manual-viewport"],
		queryFn: ({ signal }) => fetchDefectsForViewport(viewport!, signal),
		enabled: false,
		staleTime: 60_000,
		gcTime: 10 * 60_000,
		placeholderData: (previousData) => previousData,
	});
	const refetchDefects = defectQuery.refetch;

	useEffect(() => {
		if (stationQuery.data) {
			queryClient.setQueryData(stationCacheQueryKey, stationQuery.data);
		}
	}, [queryClient, stationQuery.data]);

	useEffect(() => {
		if (defectQuery.data) {
			queryClient.setQueryData(defectCacheQueryKey, defectQuery.data);
		}
	}, [defectQuery.data, queryClient]);

	useEffect(() => {
		if (
			!viewport ||
			!stationCacheQuery.isSuccess ||
			stationCacheQuery.data !== null ||
			stationInitialFetchStartedRef.current
		) {
			return;
		}

		stationInitialFetchStartedRef.current = true;
		void refetchStations();
	}, [
		refetchStations,
		stationCacheQuery.data,
		stationCacheQuery.isSuccess,
		viewport,
	]);

	useEffect(() => {
		if (
			!viewport ||
			!defectCacheQuery.isSuccess ||
			defectCacheQuery.data !== null ||
			defectInitialFetchStartedRef.current
		) {
			return;
		}

		defectInitialFetchStartedRef.current = true;
		void refetchDefects();
	}, [
		defectCacheQuery.data,
		defectCacheQuery.isSuccess,
		refetchDefects,
		viewport,
	]);

	return {
		stationData: stationQuery.data ?? stationCacheQuery.data ?? null,
		defectData: defectQuery.data ?? defectCacheQuery.data ?? null,
		defectQuery,
		stationQuery,
	};
};
