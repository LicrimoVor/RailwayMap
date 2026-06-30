import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDefectsLayer } from "../../../services/adminApi";
import { fetchStations } from "../../../services/railwayApi";
import { useMapStore } from "../../../store/mapStore";
import type { DefectCollection } from "../../../types/admin";
import type { StationFeatureCollection } from "../../../types/railway";

export const useQueryMap = () => {
	const [stationData, setStationData] =
		useState<StationFeatureCollection | null>(null);
	const [defectData, setDefectData] = useState<DefectCollection | null>(null);
	const visibleLayers = useMapStore((state) => state.visibleLayers);

	const stationQuery = useQuery({
		queryKey: ["railway-stations"],
		queryFn: fetchStations,
		enabled: visibleLayers.stations,
		staleTime: Infinity,
		gcTime: Infinity,
	});
	const defectQuery = useQuery({
		queryKey: ["admin-map-defects", "layer"],
		queryFn: fetchDefectsLayer,
		enabled: visibleLayers.defects,
		staleTime: Infinity,
		gcTime: Infinity,
	});

	useEffect(() => {
		const stations = stationQuery.data;
		if (stations) {
			setStationData(stations);
		}
	}, [stationQuery.data]);

	useEffect(() => {
		const defects = defectQuery.data;
		if (defects) {
			setDefectData(defects);
		}
	}, [defectQuery.data]);

	return {
		stationData,
		defectData,
		defectQuery,
		stationQuery,
	};
};
