import maplibregl, {
	type LayerSpecification,
	type Map as MapLibreMap,
} from "maplibre-gl";
import { RAILWAY_LINE_LAYER_ID } from "../../../../map/layers";

const S2C_ORT_LAYER_ID = "s2c_ort";
const S2C_ORT_SOURCE_ID = "s2c_ort";
const S2C_TILE_URL =
	"https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg";

const RELIEF_DEM_SOURCE_ID = "relief-dem";
const RELIEF_CONTOUR_SOURCE_ID = "relief-contours";
const RELIEF_HILLSHADE_LAYER_ID = "relief-hillshade";
const RELIEF_CONTOUR_LAYER_ID = "relief-contour-lines";
const RELIEF_CONTOUR_LABEL_LAYER_ID = "relief-contour-labels";
const RELIEF_LAYER_GROUP_CONTROL_ID = "relief-layer-group";

const RELIEF_CONTOUR_SOURCE_LAYER = "contours";
const RELIEF_DEM_TILE_URL = "https://tiles.mapterhorn.com/{z}/{x}/{y}.webp";
const RELIEF_DEM_PROTOCOL_ID = "relief-mapterhorn-dem";
const RELIEF_DEM_ENCODING = "terrarium";
const RELIEF_DEM_MAX_ZOOM = 12;
const RELIEF_CONTOUR_SOURCE_MAX_ZOOM = 16;
const RELIEF_DEM_TILE_SIZE = 256;

const MEASURE_LABEL_SOURCE_ID = "source-draw-labels";
const MEASURE_LABEL_LAYER_ID = "layer-draw-labels";
const MEASURE_LABEL_FONT = "Noto Sans Bold";
const MEASURE_DRAW_EVENTS = [
	"draw.create",
	"draw.update",
	"draw.delete",
	"draw.render",
] as const;

const rasterBaseLayers = {
	"osm-base": "Карта",
	"russia-blank-map": "Карта России",
	// [GSI_ORT_LAYER_ID]: "GSI Ort",
	[S2C_ORT_LAYER_ID]: "GPS",
};

const reliefLayerIds = [
	RELIEF_HILLSHADE_LAYER_ID,
	RELIEF_CONTOUR_LAYER_ID,
	RELIEF_CONTOUR_LABEL_LAYER_ID,
] as const;

type MlContour = typeof import("maplibre-contour").default;
type ReliefDemSource = InstanceType<MlContour["DemSource"]>;

let reliefDemSource: ReliefDemSource | null = null;

export async function addMapPluginControls(map: MapLibreMap) {
	const [
		{ Format, MaplibreExportControl, PageOrientation, Size },
		{ default: MeasuresControl },
		{ default: OpacityControl },
		{ default: mlcontour },
	] = await Promise.all([
		import("@watergis/maplibre-gl-export"),
		import("maplibre-gl-measures"),
		import("maplibre-gl-opacity"),
		import("maplibre-contour"),
	]);

	if (!map.getContainer().isConnected) {
		return;
	}

	map.addControl(
		new MaplibreExportControl({
			PageSize: Size.A4,
			PageOrientation: PageOrientation.Landscape,
			Format: Format.PNG,
			DPI: 96,
			Crosshair: true,
			PrintableArea: true,
			Local: "ru",
			Filename: "interactive-railway-map",
		}),
		"top-right",
	);

	map.addControl(
		new MeasuresControl({
			lang: {
				areaMeasurementButtonTitle: "Измерить площадь",
				lengthMeasurementButtonTitle: "Измерить расстояние",
				clearMeasurementsButtonTitle: "Очистить измерения",
			},
			units: "metric",
			fixedLengthUnit: "m",
			fixedAreaUnit: "m2",
			unitsGroupingSeparator: " ",
			maximumFractionDigits: 2,
			showOnlyTotalLineLength: true,
			style: {
				text: {
					font: MEASURE_LABEL_FONT,
					color: "#111827",
					haloColor: "#ffffff",
					haloWidth: 2,
					letterSpacing: 0,
				},
				lengthMeasurement: {
					lineColor: "#c93535",
					lineWidth: 3,
				},
				areaMeasurement: {
					fillColor: "#c93535",
					fillOutlineColor: "#c93535",
					fillOpacity: 0.08,
					lineWidth: 2,
				},
				common: {
					midPointColor: "#c93535",
					midPointHaloColor: "#ffffff",
				},
			},
		}),
		"top-right",
	);
	ensureGsiOrtLayer(map);
	ensureReliefContourLayers(map, mlcontour);
	installMeasuresLabelGuard(map);

	const baseLayers = Object.fromEntries(
		Object.entries(rasterBaseLayers).filter(([layerId]) =>
			map.getLayer(layerId),
		),
	);
	if (Object.keys(baseLayers).length > 0) {
		const opacityControl = new OpacityControl({
			overLayers: baseLayers,
			opacityControl: true,
		});
		map.addControl(opacityControl, "top-left");

		for (const layerId of Object.keys(baseLayers)) {
			if (layerId == "osm-base") {
				map.setLayoutProperty(layerId, "visibility", "visible");
				const input = document.getElementById(layerId);
				if (input instanceof HTMLInputElement) {
					input.checked = true;
				}
			} else {
				map.setLayoutProperty(layerId, "visibility", "none");
				const input = document.getElementById(layerId);
				if (input instanceof HTMLInputElement) {
					input.checked = false;
				}
			}
		}
		installReliefLayerGroupControl(map);
	}
}

function installReliefLayerGroupControl(map: MapLibreMap) {
	setReliefLayerGroupVisibility(map, true);

	const container = document.getElementById("opacity-control");
	if (
		!container ||
		document.getElementById(RELIEF_LAYER_GROUP_CONTROL_ID)
	) {
		return;
	}

	const separator = document.createElement("hr");
	const checkbox = document.createElement("input");
	checkbox.type = "checkbox";
	checkbox.id = RELIEF_LAYER_GROUP_CONTROL_ID;
	checkbox.checked = true;
	checkbox.addEventListener("change", () => {
		setReliefLayerGroupVisibility(map, checkbox.checked);
	});

	const label = document.createElement("label");
	label.htmlFor = RELIEF_LAYER_GROUP_CONTROL_ID;
	label.appendChild(document.createTextNode("Relief"));

	container.appendChild(separator);
	container.appendChild(checkbox);
	container.appendChild(label);
	container.appendChild(document.createElement("br"));
}

function setReliefLayerGroupVisibility(
	map: MapLibreMap,
	isVisible: boolean,
) {
	const visibility = isVisible ? "visible" : "none";
	for (const layerId of reliefLayerIds) {
		if (map.getLayer(layerId)) {
			map.setLayoutProperty(layerId, "visibility", visibility);
		}
	}
}

function ensureReliefContourLayers(map: MapLibreMap, mlcontour: MlContour) {
	const demSource = getReliefDemSource(mlcontour);
	const contourTileUrl = getReliefContourTileUrl(demSource);

	if (shouldResetReliefSources(map, demSource, contourTileUrl)) {
		removeReliefLayersAndSources(map);
	}

	if (!map.getSource(RELIEF_DEM_SOURCE_ID)) {
		map.addSource(RELIEF_DEM_SOURCE_ID, {
			type: "raster-dem",
			encoding: RELIEF_DEM_ENCODING,
			tiles: [demSource.sharedDemProtocolUrl],
			tileSize: RELIEF_DEM_TILE_SIZE,
			maxzoom: RELIEF_DEM_MAX_ZOOM,
			attribution:
				'<a href="https://mapterhorn.com/" target="_blank" rel="noopener noreferrer">Mapterhorn</a>',
		});
	}

	if (!map.getSource(RELIEF_CONTOUR_SOURCE_ID)) {
		map.addSource(RELIEF_CONTOUR_SOURCE_ID, {
			type: "vector",
			tiles: [contourTileUrl],
			maxzoom: RELIEF_CONTOUR_SOURCE_MAX_ZOOM,
		});
	}

	addReliefLayer(map, {
		id: RELIEF_HILLSHADE_LAYER_ID,
		type: "hillshade",
		source: RELIEF_DEM_SOURCE_ID,
		minzoom: 4,
		layout: {
			visibility: "visible",
		},
		paint: {
			"hillshade-exaggeration": 0.28,
			"hillshade-highlight-color": "#ffffff",
			"hillshade-shadow-color": "#4b5563",
			"hillshade-accent-color": "#64748b",
		},
	});

	addReliefLayer(map, {
		id: RELIEF_CONTOUR_LAYER_ID,
		type: "line",
		source: RELIEF_CONTOUR_SOURCE_ID,
		"source-layer": RELIEF_CONTOUR_SOURCE_LAYER,
		minzoom: 7,
		layout: {
			visibility: "visible",
		},
		paint: {
			"line-color": ["match", ["get", "level"], 1, "#5f4d37", "#8a765d"],
			"line-opacity": [
				"interpolate",
				["linear"],
				["zoom"],
				7,
				0.28,
				12,
				0.58,
			],
			"line-width": ["match", ["get", "level"], 1, 1.1, 0.55],
		},
	});

	addReliefLayer(map, {
		id: RELIEF_CONTOUR_LABEL_LAYER_ID,
		type: "symbol",
		source: RELIEF_CONTOUR_SOURCE_ID,
		"source-layer": RELIEF_CONTOUR_SOURCE_LAYER,
		filter: [">", ["get", "level"], 0],
		minzoom: 9,
		layout: {
			"symbol-placement": "line",
			"text-field": ["concat", ["to-string", ["get", "ele"]], " \u043C"],
			"text-font": [MEASURE_LABEL_FONT],
			"text-letter-spacing": 0,
			"text-size": ["interpolate", ["linear"], ["zoom"], 9, 10, 14, 12],
			visibility: "visible",
		},
		paint: {
			"text-color": "#5f4d37",
			"text-halo-color": "#ffffff",
			"text-halo-width": 1.2,
		},
	});

	ensureReliefLayerOrder(map);
}

function getReliefDemSource(mlcontour: MlContour) {
	if (reliefDemSource) {
		return reliefDemSource;
	}

	reliefDemSource = new mlcontour.DemSource({
		url: RELIEF_DEM_TILE_URL,
		id: RELIEF_DEM_PROTOCOL_ID,
		encoding: RELIEF_DEM_ENCODING,
		maxzoom: RELIEF_DEM_MAX_ZOOM,
		worker: true,
	});
	reliefDemSource.setupMaplibre(maplibregl);

	return reliefDemSource;
}

function getReliefContourTileUrl(demSource: ReliefDemSource) {
	return demSource.contourProtocolUrl({
		overzoom: 1,
		thresholds: {
			7: [1000, 5000],
			9: [500, 2500],
			11: [200, 1000],
			12: [100, 500],
			13: [100, 500],
			14: [50, 200],
			15: [20, 100],
		},
		elevationKey: "ele",
		levelKey: "level",
		contourLayer: RELIEF_CONTOUR_SOURCE_LAYER,
	});
}

function shouldResetReliefSources(
	map: MapLibreMap,
	demSource: ReliefDemSource,
	contourTileUrl: string,
) {
	const sources = map.getStyle().sources;
	const demMapSource = sources[RELIEF_DEM_SOURCE_ID];
	const contourMapSource = sources[RELIEF_CONTOUR_SOURCE_ID];

	if (
		demMapSource &&
		"type" in demMapSource &&
		(demMapSource.type !== "raster-dem" ||
			demMapSource.encoding !== RELIEF_DEM_ENCODING ||
			demMapSource.maxzoom !== RELIEF_DEM_MAX_ZOOM ||
			demMapSource.tiles?.[0] !== demSource.sharedDemProtocolUrl)
	) {
		return true;
	}

	return Boolean(
		contourMapSource &&
		"type" in contourMapSource &&
		(contourMapSource.type !== "vector" ||
			contourMapSource.maxzoom !== RELIEF_CONTOUR_SOURCE_MAX_ZOOM ||
			contourMapSource.tiles?.[0] !== contourTileUrl),
	);
}

function removeReliefLayersAndSources(map: MapLibreMap) {
	for (const layerId of [
		RELIEF_CONTOUR_LABEL_LAYER_ID,
		RELIEF_CONTOUR_LAYER_ID,
		RELIEF_HILLSHADE_LAYER_ID,
	]) {
		if (map.getLayer(layerId)) {
			map.removeLayer(layerId);
		}
	}

	for (const sourceId of [RELIEF_CONTOUR_SOURCE_ID, RELIEF_DEM_SOURCE_ID]) {
		if (map.getSource(sourceId)) {
			map.removeSource(sourceId);
		}
	}
}

function addReliefLayer(map: MapLibreMap, layer: LayerSpecification) {
	if (!map.getLayer(layer.id)) {
		map.addLayer(layer, getRailwayLayerAnchor(map));
	}
}

function ensureReliefLayerOrder(map: MapLibreMap) {
	const anchorLayerId = getRailwayLayerAnchor(map);
	for (const layerId of [
		RELIEF_HILLSHADE_LAYER_ID,
		RELIEF_CONTOUR_LAYER_ID,
		RELIEF_CONTOUR_LABEL_LAYER_ID,
	]) {
		if (map.getLayer(layerId)) {
			map.moveLayer(layerId, anchorLayerId);
		}
	}
}

function getRailwayLayerAnchor(map: MapLibreMap) {
	return map.getLayer(RAILWAY_LINE_LAYER_ID)
		? RAILWAY_LINE_LAYER_ID
		: undefined;
}

function installMeasuresLabelGuard(map: MapLibreMap) {
	ensureMeasuresLabelLayer(map);

	const normalizeLabels = () => {
		window.requestAnimationFrame(() => {
			if (map.getContainer().isConnected) {
				ensureMeasuresLabelLayer(map);
			}
		});
	};

	for (const eventName of MEASURE_DRAW_EVENTS) {
		map.on(eventName, normalizeLabels);
	}
}

function ensureMeasuresLabelLayer(map: MapLibreMap) {
	if (!map.getSource(MEASURE_LABEL_SOURCE_ID)) {
		map.addSource(MEASURE_LABEL_SOURCE_ID, {
			type: "geojson",
			data: {
				type: "FeatureCollection",
				features: [],
			},
		});
	}

	if (!map.getLayer(MEASURE_LABEL_LAYER_ID)) {
		map.addLayer({
			id: MEASURE_LABEL_LAYER_ID,
			type: "symbol",
			source: MEASURE_LABEL_SOURCE_ID,
			layout: {
				"text-font": [MEASURE_LABEL_FONT],
				"text-field": ["get", "measurement"],
				"text-variable-anchor": ["top", "bottom", "left", "right"],
				"text-radial-offset": 0.7,
				"text-justify": "auto",
				"text-letter-spacing": 0,
				"text-size": [
					"interpolate",
					["linear"],
					["zoom"],
					5,
					12,
					10,
					14,
					14,
					16,
					18,
					18,
				],
				"text-allow-overlap": true,
				"text-ignore-placement": true,
			},
			paint: {
				"text-color": "#111827",
				"text-halo-color": "#ffffff",
				"text-halo-width": 2,
			},
		});
	} else {
		map.setLayoutProperty(MEASURE_LABEL_LAYER_ID, "text-font", [
			MEASURE_LABEL_FONT,
		]);
		map.setLayoutProperty(MEASURE_LABEL_LAYER_ID, "text-field", [
			"get",
			"measurement",
		]);
		map.setLayoutProperty(
			MEASURE_LABEL_LAYER_ID,
			"text-allow-overlap",
			true,
		);
		map.setLayoutProperty(
			MEASURE_LABEL_LAYER_ID,
			"text-ignore-placement",
			true,
		);
		map.setPaintProperty(MEASURE_LABEL_LAYER_ID, "text-color", "#111827");
		map.setPaintProperty(
			MEASURE_LABEL_LAYER_ID,
			"text-halo-color",
			"#ffffff",
		);
		map.setPaintProperty(MEASURE_LABEL_LAYER_ID, "text-halo-width", 2);
	}

	map.moveLayer(MEASURE_LABEL_LAYER_ID);
}

function ensureGsiOrtLayer(map: MapLibreMap) {
	if (!map.getSource(S2C_ORT_SOURCE_ID)) {
		map.addSource(S2C_ORT_SOURCE_ID, {
			type: "raster",
			tiles: [S2C_TILE_URL],
			tileSize: 256,
			attribution:
				'<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener noreferrer">GSI Tiles</a>',
		});
	}

	if (!map.getLayer(S2C_ORT_LAYER_ID)) {
		map.addLayer(
			{
				id: S2C_ORT_LAYER_ID,
				type: "raster",
				source: S2C_ORT_SOURCE_ID,
				minzoom: 0,
				maxzoom: 18,
				paint: {
					"raster-opacity": 1,
				},
			},
			map.getLayer(RAILWAY_LINE_LAYER_ID)
				? RAILWAY_LINE_LAYER_ID
				: undefined,
		);
		return;
	}

	if (map.getLayer(RAILWAY_LINE_LAYER_ID)) {
		map.moveLayer(S2C_ORT_SOURCE_ID, RAILWAY_LINE_LAYER_ID);
	}
}
