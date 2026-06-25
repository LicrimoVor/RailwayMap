from __future__ import annotations

import argparse
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.osm.importer import OSMImporter


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import railway OSM data from a .osm.pbf file.")
    parser.add_argument("pbf_path", type=Path, help="Path to a local .osm.pbf extract.")
    parser.add_argument("--database-url", default=None, help="SQLAlchemy database URL.")
    parser.add_argument("--batch-size", type=int, default=1_000, help="Flush every N features.")
    parser.add_argument(
        "--reader",
        choices=("osmium", "pyrosm"),
        default="osmium",
        help="PBF reader backend. osmium streams data and uses much less memory.",
    )
    parser.add_argument(
        "--location-index",
        default="sparse_file_array",
        help="osmium node location index. File-backed indexes use less RAM.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Flush changes and roll them back.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    database_url = args.database_url or get_settings().database_url

    engine = create_engine(database_url, pool_pre_ping=True)
    session_factory = sessionmaker(bind=engine, autoflush=True, autocommit=False)

    with session_factory() as session:
        importer = OSMImporter(session=session, batch_size=args.batch_size)
        stats = importer.import_pbf(
            args.pbf_path,
            commit=not args.dry_run,
            reader=args.reader,
            location_index=args.location_index,
        )
        if args.dry_run:
            session.rollback()

    print(
        "OSM import finished: "
        f"segments created={stats.segments_created}, "
        f"segments updated={stats.segments_updated}, "
        f"segments skipped={stats.segments_skipped}, "
        f"stations created={stats.stations_created}, "
        f"stations updated={stats.stations_updated}, "
        f"stations skipped={stats.stations_skipped}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
