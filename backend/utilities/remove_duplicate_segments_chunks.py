from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.services.deduplicate import DeduplicationResult, remove_duplicate_railway_rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Remove duplicate railway segments and chunks.")
    parser.add_argument("--database-url", default=None, help="SQLAlchemy database URL.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Delete duplicates. Without this flag the utility only prints duplicate counts.",
    )
    parser.add_argument("--skip-segments", action="store_true", help="Do not check railway_segments.")
    parser.add_argument("--skip-chunks", action="store_true", help="Do not check railway_segment_chunks.")
    parser.add_argument(
        "--skip-sections-50km",
        action="store_true",
        help="Do not check railway_segment_sections_50km.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    database_url = args.database_url or get_settings().database_url
    engine = create_engine(database_url, pool_pre_ping=True)
    session_factory = sessionmaker(bind=engine, autoflush=True, autocommit=False)

    with session_factory() as session:
        result = remove_duplicate_railway_rows(
            session,
            include_segments=not args.skip_segments,
            include_chunks=not args.skip_chunks,
            include_sections_50km=not args.skip_sections_50km,
            dry_run=not args.apply,
        )
        if args.apply:
            session.commit()
        else:
            session.rollback()

    print_result(result, applied=args.apply)
    return 0


def print_result(result: DeduplicationResult, *, applied: bool) -> None:
    action = "Deleted" if applied else "Found"
    print(f"{action} duplicate railway rows: {result.total}")
    print(f"  segments by OSM id: {result.duplicate_segments_by_osm_id}")
    print(f"  segments by exact geometry: {result.duplicate_segments_by_geometry}")
    print(f"  chunks: {result.duplicate_chunks}")
    print(f"  50 km sections: {result.duplicate_sections_50km}")
    if not applied:
        print("Dry run only. Re-run with --apply to delete these rows.")


if __name__ == "__main__":
    raise SystemExit(main())
