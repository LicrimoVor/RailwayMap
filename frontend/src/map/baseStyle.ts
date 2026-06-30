import type { StyleSpecification } from "maplibre-gl";
import russiaBlankMapUrl from "../assets/Blank_map_of_Russia-gray.svg?url";

const OSM_TILE_PROBE_URL = "https://tile.openstreetmap.org/0/0/0.png";
const TILE_PROBE_TIMEOUT_MS = 2_500;

export const osmRasterMapStyle: StyleSpecification = {
	version: 8,
	glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
	sources: {
		osm: {
			type: "raster",
			tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
			tileSize: 256,
			attribution: "&copy; OpenStreetMap contributors",
		},
	},
	layers: [
		{
			id: "osm-base",
			type: "raster",
			source: "osm",
		},
	],
};

export const localRussiaMapStyle: StyleSpecification = {
	version: 8,
	glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
	sources: {
		"russia-blank-map": {
			type: "image",
			url: russiaBlankMapUrl,
			coordinates: [
				[18, 83],
				[180, 83],
				[180, 40],
				[18, 40],
			],
		},
	},
	layers: [
		{
			id: "background",
			type: "background",
			paint: {
				"background-color": "#eef2ee",
			},
		},
		{
			id: "russia-blank-map",
			type: "raster",
			source: "russia-blank-map",
			paint: {
				"raster-opacity": 0.92,
			},
		},
	],
};

let baseMapStylePromise: Promise<StyleSpecification> | null = null;

export function resolveBaseMapStyle(): Promise<StyleSpecification> {
	baseMapStylePromise ??= canLoadOsmTiles().then((canLoad) =>
		cloneStyle(canLoad ? osmRasterMapStyle : localRussiaMapStyle),
	);
	return baseMapStylePromise;
}

function canLoadOsmTiles(): Promise<boolean> {
	if (typeof window === "undefined" || typeof Image === "undefined") {
		return Promise.resolve(false);
	}
	if ("onLine" in navigator && !navigator.onLine) {
		return Promise.resolve(false);
	}

	return new Promise((resolve) => {
		const image = new Image();
		const timeout = window.setTimeout(() => {
			cleanup();
			resolve(false);
		}, TILE_PROBE_TIMEOUT_MS);

		const cleanup = () => {
			window.clearTimeout(timeout);
			image.onload = null;
			image.onerror = null;
		};

		image.onload = () => {
			cleanup();
			resolve(true);
		};
		image.onerror = () => {
			cleanup();
			resolve(false);
		};
		image.referrerPolicy = "no-referrer";
		image.src = `${OSM_TILE_PROBE_URL}?probe=${Date.now()}`;
	});
}

function cloneStyle(style: StyleSpecification): StyleSpecification {
	return JSON.parse(JSON.stringify(style)) as StyleSpecification;
}
