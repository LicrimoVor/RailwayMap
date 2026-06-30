from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from tqdm import tqdm
from geoalchemy2.shape import from_shape
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.railway import RailwaySegment, Station
from app.osm.features import OSMFeature
from app.osm.normalizers import railway_segment_features, railway_segment_values, station_values
from app.osm.readers import OsmiumRailwayReader, PyrosmRailwayReader
from app.services.chunks import segment_chunks_from_line, segment_sections_10km_from_line

ImportAction = Literal["created", "updated", "skipped"]
SegmentImportResult = tuple[ImportAction, int, int]


@dataclass
class OSMImportStats:
    segments_created: int = 0
    segments_updated: int = 0
    segments_skipped: int = 0
    chunks_written: int = 0
    sections_10km_written: int = 0
    stations_created: int = 0
    stations_updated: int = 0
    stations_skipped: int = 0

    @property
    def total_written(self) -> int:
        return (
            self.segments_created
            + self.segments_updated
            + self.stations_created
            + self.stations_updated
        )


class OSMImporter:
    def __init__(self, session: Session, batch_size: int = 1_000) -> None:
        self.session = session
        self.batch_size = batch_size

    def import_pbf(
        self,
        pbf_path: str | Path,
        commit: bool = True,
        reader: Literal["osmium", "pyrosm"] = "osmium",
        location_index: str = "sparse_file_array",
    ) -> OSMImportStats:
        if reader == "pyrosm":
            return self._import_pbf_with_pyrosm(pbf_path=pbf_path, commit=commit)
        return self._import_pbf_with_osmium(
            pbf_path=pbf_path,
            commit=commit,
            location_index=location_index,
        )

    def _import_pbf_with_pyrosm(self, pbf_path: str | Path, commit: bool) -> OSMImportStats:
        reader = PyrosmRailwayReader(pbf_path)
        return self.import_features(
            segment_features=reader.iter_railway_segments(),
            station_features=reader.iter_stations(),
            commit=commit,
        )

    def _import_pbf_with_osmium(
        self,
        pbf_path: str | Path,
        commit: bool,
        location_index: str,
    ) -> OSMImportStats:
        stats = OSMImportStats()
        segment_index = 0
        station_index = 0

        def on_segment(feature: OSMFeature) -> None:
            nonlocal segment_index
            for action, chunks_written, sections_10km_written in tqdm(
                self._upsert_segments(feature)
            ):
                segment_index += 1
                match action:
                    case "created":
                        stats.segments_created += 1
                    case "updated":
                        stats.segments_updated += 1
                    case "skipped":
                        stats.segments_skipped += 1
                stats.chunks_written += chunks_written
                stats.sections_10km_written += sections_10km_written
                self._flush_batch(segment_index)

        def on_station(feature: OSMFeature) -> None:
            nonlocal station_index
            station_index += 1
            match self._upsert_station(feature):
                case "created":
                    stats.stations_created += 1
                case "updated":
                    stats.stations_updated += 1
                case "skipped":
                    stats.stations_skipped += 1
            self._flush_batch(station_index)

        OsmiumRailwayReader(pbf_path, location_index=location_index).read(
            on_segment=on_segment,
            on_station=on_station,
        )

        if commit:
            self.session.commit()
        else:
            self.session.flush()

        return stats

    def import_features(
        self,
        segment_features: Iterable[OSMFeature],
        station_features: Iterable[OSMFeature],
        commit: bool = True,
    ) -> OSMImportStats:
        stats = OSMImportStats()

        for index, feature in tqdm(enumerate(segment_features, start=1)):
            for action, chunks_written, sections_10km_written in self._upsert_segments(feature):
                match action:
                    case "created":
                        stats.segments_created += 1
                    case "updated":
                        stats.segments_updated += 1
                    case "skipped":
                        stats.segments_skipped += 1
                stats.chunks_written += chunks_written
                stats.sections_10km_written += sections_10km_written
            self._flush_batch(index)

        for index, feature in enumerate(station_features, start=1):
            match self._upsert_station(feature):
                case "created":
                    stats.stations_created += 1
                case "updated":
                    stats.stations_updated += 1
                case "skipped":
                    stats.stations_skipped += 1
            self._flush_batch(index)

        if commit:
            self.session.commit()
        else:
            self.session.flush()

        return stats

    def _upsert_segments(self, feature: OSMFeature) -> list[SegmentImportResult]:
        segment_features = railway_segment_features(feature)
        if not segment_features:
            return [("skipped", 0, 0)]
        return [self._upsert_segment(segment_feature) for segment_feature in segment_features]

    def _upsert_segment(self, feature: OSMFeature) -> SegmentImportResult:
        values = railway_segment_values(feature)
        if values is None:
            return ("skipped", 0, 0)

        geometry = values.pop("geometry")
        values["geometry"] = from_shape(geometry, srid=4326)
        chunks = segment_chunks_from_line(geometry)
        sections_10km = segment_sections_10km_from_line(geometry)

        segment = self.session.scalar(
            select(RailwaySegment).where(
                RailwaySegment.osm_type == feature.osm_type,
                RailwaySegment.osm_id == feature.osm_id,
            )
        )
        if segment is None:
            segment = RailwaySegment(osm_type=feature.osm_type, osm_id=feature.osm_id, **values)
            segment.chunks = chunks
            segment.sections_10km = sections_10km
            self.session.add(segment)
            return ("created", len(chunks), len(sections_10km))

        for key, value in values.items():
            setattr(segment, key, value)
        segment.chunks = chunks
        segment.sections_10km = sections_10km
        return ("updated", len(chunks), len(sections_10km))

    def _upsert_station(self, feature: OSMFeature) -> ImportAction:
        values = station_values(feature)
        if values is None:
            return "skipped"

        geometry = values.pop("geometry")
        values["geometry"] = from_shape(geometry, srid=4326)

        station = self.session.scalar(
            select(Station).where(
                Station.osm_type == feature.osm_type,
                Station.osm_id == feature.osm_id,
            )
        )
        if station is None:
            self.session.add(Station(osm_type=feature.osm_type, osm_id=feature.osm_id, **values))
            return "created"

        for key, value in values.items():
            setattr(station, key, value)
        return "updated"

    def _flush_batch(self, index: int) -> None:
        if index % self.batch_size == 0:
            self.session.flush()
