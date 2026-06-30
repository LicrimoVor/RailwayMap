import type { Position } from "../../../types/geojson";
import type { RailwayFeature } from "../../../types/railway";

export type ElevationProfilePoint = {
	distanceM: number;
	distanceKm: number;
	lon: number;
	lat: number;
	elevationM: number | null;
};

export type ElevationProfileStats = {
	totalDistanceM: number;
	minElevationM: number | null;
	maxElevationM: number | null;
	elevationGainM: number;
	elevationLossM: number;
	sampleCount: number;
	failedSamples: number;
	zoom: number;
};

export type ElevationProfileResult = {
	points: ElevationProfilePoint[];
	stats: ElevationProfileStats;
};

type PathSegment = {
	start: Position;
	end: Position;
	startDistanceM: number;
	endDistanceM: number;
	lengthM: number;
};

type DecodedDemTile = {
	width: number;
	height: number;
	data: Uint8ClampedArray;
};

type TilePoint = {
	zoom: number;
	x: number;
	y: number;
	xFraction: number;
	yFraction: number;
};

const DEM_TILE_URL = "https://tiles.mapterhorn.com/{z}/{x}/{y}.webp";
const DEM_TILE_SIZE = 256;
const EARTH_RADIUS_M = 6_371_008.8;
const MAX_MERCATOR_LAT = 85.05112878;
const TARGET_SAMPLE_INTERVAL_M = 1_000;
const MIN_PROFILE_POINTS = 24;
const MAX_PROFILE_POINTS = 160;

const demTileCache = new Map<string, Promise<DecodedDemTile>>();
let decodeCanvas: HTMLCanvasElement | null = null;

export async function buildElevationProfile(
	feature: RailwayFeature,
	signal: AbortSignal,
): Promise<ElevationProfileResult> {
	const coordinates = normalizeCoordinates(feature.geometry.coordinates);
	const path = buildPath(coordinates);

	if (path.totalDistanceM <= 0 || path.segments.length === 0) {
		return emptyProfile();
	}

	const zoom = zoomForDistance(path.totalDistanceM);
	const samples = samplePath(path.segments, path.totalDistanceM);
	const points = await Promise.all(
		samples.map(async (sample) => {
			checkAbort(signal);

			try {
				const elevationM = await elevationAt(sample.lon, sample.lat, zoom, signal);

				return {
					...sample,
					distanceKm: sample.distanceM / 1000,
					elevationM,
				};
			} catch (error) {
				if (isAbortError(error)) {
					throw error;
				}

				return {
					...sample,
					distanceKm: sample.distanceM / 1000,
					elevationM: null,
				};
			}
		}),
	);

	return {
		points,
		stats: profileStats(points, path.totalDistanceM, zoom),
	};
}

function normalizeCoordinates(coordinates: Position[]): Position[] {
	return coordinates.filter(
		([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat),
	);
}

function buildPath(coordinates: Position[]): {
	segments: PathSegment[];
	totalDistanceM: number;
} {
	let totalDistanceM = 0;
	const segments: PathSegment[] = [];

	for (let index = 1; index < coordinates.length; index += 1) {
		const start = coordinates[index - 1];
		const end = coordinates[index];
		const lengthM = distanceMeters(start, end);

		if (lengthM <= 0) {
			continue;
		}

		const startDistanceM = totalDistanceM;
		totalDistanceM += lengthM;
		segments.push({
			start,
			end,
			startDistanceM,
			endDistanceM: totalDistanceM,
			lengthM,
		});
	}

	return { segments, totalDistanceM };
}

function samplePath(
	segments: PathSegment[],
	totalDistanceM: number,
): Array<{ distanceM: number; lon: number; lat: number }> {
	const sampleCount = sampleCountForDistance(totalDistanceM);
	const samples: Array<{ distanceM: number; lon: number; lat: number }> = [];
	let segmentIndex = 0;

	for (let index = 0; index < sampleCount; index += 1) {
		const distanceM =
			sampleCount === 1 ? 0 : (totalDistanceM * index) / (sampleCount - 1);

		while (
			segmentIndex < segments.length - 1 &&
			distanceM > segments[segmentIndex].endDistanceM
		) {
			segmentIndex += 1;
		}

		const segment = segments[segmentIndex];
		const ratio = clamp(
			(distanceM - segment.startDistanceM) / segment.lengthM,
			0,
			1,
		);

		samples.push({
			distanceM,
			lon: lerp(segment.start[0], segment.end[0], ratio),
			lat: lerp(segment.start[1], segment.end[1], ratio),
		});
	}

	return samples;
}

function sampleCountForDistance(totalDistanceM: number): number {
	if (totalDistanceM < 500) {
		return 12;
	}

	return Math.min(
		MAX_PROFILE_POINTS,
		Math.max(
			MIN_PROFILE_POINTS,
			Math.ceil(totalDistanceM / TARGET_SAMPLE_INTERVAL_M) + 1,
		),
	);
}

function zoomForDistance(totalDistanceM: number): number {
	if (totalDistanceM > 1_200_000) {
		return 8;
	}
	if (totalDistanceM > 600_000) {
		return 9;
	}
	if (totalDistanceM > 250_000) {
		return 10;
	}
	if (totalDistanceM > 100_000) {
		return 11;
	}
	return 12;
}

async function elevationAt(
	lon: number,
	lat: number,
	zoom: number,
	signal: AbortSignal,
): Promise<number> {
	const tilePoint = projectToTile(lon, lat, zoom);
	const tile = await loadDemTile(tilePoint, signal);
	const pixelX = clamp(
		Math.floor(tilePoint.xFraction * tile.width),
		0,
		tile.width - 1,
	);
	const pixelY = clamp(
		Math.floor(tilePoint.yFraction * tile.height),
		0,
		tile.height - 1,
	);
	const offset = (pixelY * tile.width + pixelX) * 4;
	const red = tile.data[offset] ?? 0;
	const green = tile.data[offset + 1] ?? 0;
	const blue = tile.data[offset + 2] ?? 0;

	return red * 256 + green + blue / 256 - 32768;
}

function projectToTile(lon: number, lat: number, zoom: number): TilePoint {
	const tileCount = 2 ** zoom;
	const safeLat = clamp(lat, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT);
	const latRadians = (safeLat * Math.PI) / 180;
	const xProjected = ((lon + 180) / 360) * tileCount;
	const yProjected =
		((1 -
			Math.log(Math.tan(latRadians) + 1 / Math.cos(latRadians)) / Math.PI) /
			2) *
		tileCount;
	const xPosition = clamp(xProjected, 0, tileCount - 1e-9);
	const yPosition = clamp(yProjected, 0, tileCount - 1e-9);
	const x = Math.floor(xPosition);
	const y = Math.floor(yPosition);

	return {
		zoom,
		x,
		y,
		xFraction: xPosition - x,
		yFraction: yPosition - y,
	};
}

async function loadDemTile(
	tilePoint: Pick<TilePoint, "zoom" | "x" | "y">,
	signal: AbortSignal,
): Promise<DecodedDemTile> {
	const cacheKey = `${tilePoint.zoom}/${tilePoint.x}/${tilePoint.y}`;
	const cached = demTileCache.get(cacheKey);

	if (cached) {
		return cached;
	}

	const tilePromise = fetch(demTileUrl(tilePoint), { signal })
		.then(async (response) => {
			if (!response.ok) {
				throw new Error(`DEM tile request failed: ${response.status}`);
			}

			const blob = await response.blob();
			checkAbort(signal);

			return decodeDemTile(blob, signal);
		})
		.catch((error) => {
			demTileCache.delete(cacheKey);
			throw error;
		});

	demTileCache.set(cacheKey, tilePromise);
	return tilePromise;
}

async function decodeDemTile(
	blob: Blob,
	signal: AbortSignal,
): Promise<DecodedDemTile> {
	const bitmap = await createImageBitmap(blob);
	checkAbort(signal);

	const width = bitmap.width || DEM_TILE_SIZE;
	const height = bitmap.height || DEM_TILE_SIZE;
	const canvas = getDecodeCanvas();
	canvas.width = width;
	canvas.height = height;

	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) {
		bitmap.close();
		throw new Error("Canvas 2D context is unavailable");
	}

	context.drawImage(bitmap, 0, 0, width, height);
	const imageData = context.getImageData(0, 0, width, height);
	bitmap.close();

	return {
		width,
		height,
		data: imageData.data,
	};
}

function getDecodeCanvas(): HTMLCanvasElement {
	if (!decodeCanvas) {
		decodeCanvas = document.createElement("canvas");
	}

	return decodeCanvas;
}

function demTileUrl({ zoom, x, y }: Pick<TilePoint, "zoom" | "x" | "y">) {
	return DEM_TILE_URL.replace("{z}", String(zoom))
		.replace("{x}", String(x))
		.replace("{y}", String(y));
}

function profileStats(
	points: ElevationProfilePoint[],
	totalDistanceM: number,
	zoom: number,
): ElevationProfileStats {
	const validElevations = points
		.map((point) => point.elevationM)
		.filter((value): value is number => Number.isFinite(value));
	let elevationGainM = 0;
	let elevationLossM = 0;
	let previousElevation: number | null = null;

	for (const point of points) {
		const elevation = point.elevationM;
		if (elevation === null || !Number.isFinite(elevation)) {
			previousElevation = null;
			continue;
		}

		if (previousElevation !== null) {
			const delta = elevation - previousElevation;
			if (delta > 0) {
				elevationGainM += delta;
			} else {
				elevationLossM += Math.abs(delta);
			}
		}

		previousElevation = elevation;
	}

	return {
		totalDistanceM,
		minElevationM:
			validElevations.length > 0 ? Math.min(...validElevations) : null,
		maxElevationM:
			validElevations.length > 0 ? Math.max(...validElevations) : null,
		elevationGainM,
		elevationLossM,
		sampleCount: points.length,
		failedSamples: points.length - validElevations.length,
		zoom,
	};
}

function emptyProfile(): ElevationProfileResult {
	return {
		points: [],
		stats: {
			totalDistanceM: 0,
			minElevationM: null,
			maxElevationM: null,
			elevationGainM: 0,
			elevationLossM: 0,
			sampleCount: 0,
			failedSamples: 0,
			zoom: 0,
		},
	};
}

function distanceMeters(start: Position, end: Position): number {
	const startLat = toRadians(start[1]);
	const endLat = toRadians(end[1]);
	const deltaLat = toRadians(end[1] - start[1]);
	const deltaLon = toRadians(end[0] - start[0]);
	const a =
		Math.sin(deltaLat / 2) ** 2 +
		Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLon / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return EARTH_RADIUS_M * c;
}

function toRadians(value: number): number {
	return (value * Math.PI) / 180;
}

function lerp(start: number, end: number, ratio: number): number {
	return start + (end - start) * ratio;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function checkAbort(signal: AbortSignal) {
	if (signal.aborted) {
		throw new DOMException("Aborted", "AbortError");
	}
}

function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}
