import type { RailwayMapViewport } from "../../types/railway";

const VIEWPORT_BOUNDS_PADDING_RATIO = 0.1;

export type ViewportBBoxParams = {
	min_lon: number;
	min_lat: number;
	max_lon: number;
	max_lat: number;
};

export function bboxParamsForViewport(
	viewport: RailwayMapViewport,
): ViewportBBoxParams {
	const lonPadding = Math.max(
		(viewport.maxLon - viewport.minLon) * VIEWPORT_BOUNDS_PADDING_RATIO,
		0.05,
	);
	const latPadding = Math.max(
		(viewport.maxLat - viewport.minLat) * VIEWPORT_BOUNDS_PADDING_RATIO,
		0.05,
	);

	return {
		min_lon: clamp(viewport.minLon - lonPadding, -180, 180),
		min_lat: clamp(viewport.minLat - latPadding, -90, 90),
		max_lon: clamp(viewport.maxLon + lonPadding, -180, 180),
		max_lat: clamp(viewport.maxLat + latPadding, -90, 90),
	};
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
