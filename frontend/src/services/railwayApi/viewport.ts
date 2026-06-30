import type { RailwayMapViewport } from "../../types/railway";

const VIEWPORT_BOUNDS_PADDING_RATIO = 0.1;
const VIEWPORT_BOUNDS_PRECISION = 2;

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
		min_lon: roundCoordinate(clamp(viewport.minLon - lonPadding, -180, 180)),
		min_lat: roundCoordinate(clamp(viewport.minLat - latPadding, -90, 90)),
		max_lon: roundCoordinate(clamp(viewport.maxLon + lonPadding, -180, 180)),
		max_lat: roundCoordinate(clamp(viewport.maxLat + latPadding, -90, 90)),
	};
}

export function viewportRequestKey(
	viewport: RailwayMapViewport | null,
): string | null {
	if (!viewport) {
		return null;
	}

	return bboxCacheKeyParts(bboxParamsForViewport(viewport)).join(":");
}

export function bboxCacheKey(
	prefix: string,
	bboxParams: ViewportBBoxParams,
): string {
	return [prefix, ...bboxCacheKeyParts(bboxParams)].join(":");
}

function bboxCacheKeyParts(bboxParams: ViewportBBoxParams): string[] {
	return [
		bboxParams.min_lon.toFixed(VIEWPORT_BOUNDS_PRECISION),
		bboxParams.min_lat.toFixed(VIEWPORT_BOUNDS_PRECISION),
		bboxParams.max_lon.toFixed(VIEWPORT_BOUNDS_PRECISION),
		bboxParams.max_lat.toFixed(VIEWPORT_BOUNDS_PRECISION),
	];
}

function roundCoordinate(value: number): number {
	const multiplier = 10 ** VIEWPORT_BOUNDS_PRECISION;
	return Math.round(value * multiplier) / multiplier;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
