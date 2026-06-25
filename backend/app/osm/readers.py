from __future__ import annotations

from collections.abc import Callable, Iterable
from pathlib import Path
from typing import Any

from shapely.geometry import LineString, Point

from app.osm.features import OSMFeature
from app.osm.normalizers import parse_osm_id

RailwayFeatureCallback = Callable[[OSMFeature], None]

RAILWAY_LINE_VALUES = {
    "abandoned",
    "construction",
    "disused",
    "funicular",
    "light_rail",
    "miniature",
    "monorail",
    "narrow_gauge",
    "preserved",
    "rail",
    "subway",
    "tram",
}

RAILWAY_FACILITY_VALUES = {
    "depot",
    "engine_shed",
    "halt",
    "junction",
    "roundhouse",
    "service_station",
    "station",
    "tram_stop",
    "workshop",
    "yard",
}

PYROSM_SEGMENT_ATTRIBUTES = [
    "branch",
    "bridge",
    "cutting",
    "electrified",
    "frequency",
    "gauge",
    "int_name",
    "layer",
    "line",
    "maxspeed",
    "name",
    "name:en",
    "name:ru",
    "oneway",
    "operator",
    "passenger_lines",
    "railway",
    "route",
    "service",
    "tunnel",
    "usage",
    "voltage",
]

PYROSM_STATION_ATTRIBUTES = [
    "esr_code",
    "int_name",
    "name",
    "name:en",
    "name:ru",
    "operator",
    "railway",
    "railway:ref",
    "ref",
    "ref:esr",
]


class OsmiumRailwayReader:
    def __init__(self, pbf_path: str | Path, location_index: str = "sparse_file_array") -> None:
        self.pbf_path = Path(pbf_path)
        self.location_index = location_index

    def read(
        self,
        on_segment: RailwayFeatureCallback,
        on_station: RailwayFeatureCallback,
    ) -> None:
        try:
            import osmium
        except ModuleNotFoundError as exc:
            raise ImportError(
                "osmium is required for streaming PBF import. Install import dependencies with "
                '`python -m pip install -e ".[import]"`.'
            ) from exc

        handler = _OsmiumRailwayHandler(
            osmium=osmium,
            on_segment=on_segment,
            on_station=on_station,
        )

        try:
            handler.apply_file(str(self.pbf_path), locations=True, idx=self.location_index)
        except TypeError:
            handler.apply_file(str(self.pbf_path), locations=True)


class _OsmiumRailwayHandler:
    def __new__(
        cls,
        osmium: Any,
        on_segment: RailwayFeatureCallback,
        on_station: RailwayFeatureCallback,
    ) -> Any:
        class Handler(osmium.SimpleHandler):
            def node(self, node: Any) -> None:
                tags = _tags_to_dict(node.tags)
                railway_type = tags.get("railway")
                if railway_type not in RAILWAY_FACILITY_VALUES:
                    return

                on_station(
                    OSMFeature(
                        osm_id=int(node.id),
                        osm_type="node",
                        geometry=Point(float(node.location.lon), float(node.location.lat)),
                        properties=tags,
                    )
                )

            def way(self, way: Any) -> None:
                tags = _tags_to_dict(way.tags)
                railway_type = tags.get("railway")
                if railway_type is None:
                    return

                coordinates = _way_coordinates(osmium, way)
                if len(coordinates) >= 2 and railway_type in RAILWAY_LINE_VALUES:
                    on_segment(
                        OSMFeature(
                            osm_id=int(way.id),
                            osm_type="way",
                            geometry=LineString(coordinates),
                            properties=tags,
                        )
                    )

                if coordinates and railway_type in RAILWAY_FACILITY_VALUES:
                    geometry = Point(coordinates[0]) if len(coordinates) == 1 else LineString(coordinates)
                    on_station(
                        OSMFeature(
                            osm_id=int(way.id),
                            osm_type="way",
                            geometry=geometry,
                            properties=tags,
                        )
                    )

        return Handler()


def _tags_to_dict(tags: Any) -> dict[str, str]:
    return {str(tag.k): str(tag.v) for tag in tags}


def _way_coordinates(osmium: Any, way: Any) -> list[tuple[float, float]]:
    coordinates: list[tuple[float, float]] = []
    try:
        for node in way.nodes:
            coordinates.append((float(node.lon), float(node.lat)))
    except osmium.InvalidLocationError:
        return []
    return coordinates


class PyrosmRailwayReader:
    def __init__(self, pbf_path: str | Path) -> None:
        try:
            from pyrosm import OSM
        except ModuleNotFoundError as exc:
            raise ImportError(
                "pyrosm is required for PBF import. Install import dependencies with "
                '`python -m pip install -e ".[import]"`.'
            ) from exc

        self.pbf_path = Path(pbf_path)
        self.osm = OSM(str(self.pbf_path))

    def iter_railway_segments(self) -> Iterable[OSMFeature]:
        gdf = self._get_data(
            custom_filter={"railway": list(RAILWAY_LINE_VALUES)},
            keep_nodes=False,
            keep_ways=True,
            keep_relations=False,
            extra_attributes=PYROSM_SEGMENT_ATTRIBUTES,
        )
        yield from self._iter_features(gdf)

    def iter_stations(self) -> Iterable[OSMFeature]:
        gdf = self._get_data(
            custom_filter={"railway": list(RAILWAY_FACILITY_VALUES)},
            keep_nodes=True,
            keep_ways=True,
            keep_relations=False,
            extra_attributes=PYROSM_STATION_ATTRIBUTES,
        )
        yield from self._iter_features(gdf)

    def _get_data(self, **kwargs: Any) -> Any:
        try:
            return self.osm.get_data_by_custom_criteria(filter_type="keep", **kwargs)
        except TypeError:
            kwargs.pop("extra_attributes", None)
            return self.osm.get_data_by_custom_criteria(filter_type="keep", **kwargs)

    def _iter_features(self, gdf: Any) -> Iterable[OSMFeature]:
        if gdf is None:
            return

        for row_index, row in gdf.iterrows():
            properties = row.to_dict()
            geometry = properties.pop("geometry", None)
            raw_id = properties.get("id") or properties.get("osm_id") or row_index
            osm_id = parse_osm_id(raw_id)
            osm_type = _parse_osm_type(raw_id)

            if osm_id is None or geometry is None:
                continue

            yield OSMFeature(osm_id=osm_id, osm_type=osm_type, geometry=geometry, properties=properties)


def _parse_osm_type(value: Any) -> str:
    value = str(value)
    if "/" in value:
        return value.split("/", 1)[0]
    return "way"
