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
from app.services.chunks import rebuild_segment_chunks


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Rebuild selectable railway chunks.")
    parser.add_argument("--database-url", default=None, help="SQLAlchemy database URL.")
    parser.add_argument("--chunk-length-m", type=float, default=100.0, help="Target chunk length.")
    parser.add_argument("--segment-id", type=int, action="append", help="Limit rebuild to segment id.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    database_url = args.database_url or get_settings().database_url
    engine = create_engine(database_url, pool_pre_ping=True)
    session_factory = sessionmaker(bind=engine, autoflush=True, autocommit=False)

    with session_factory() as session:
        created = rebuild_segment_chunks(
            session,
            chunk_length_m=args.chunk_length_m,
            segment_ids=args.segment_id,
        )
        session.commit()

    print(f"Created {created} railway chunks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
