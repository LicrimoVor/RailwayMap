from __future__ import annotations

import argparse
import shutil
from pathlib import Path
from urllib.request import urlopen

DEFAULT_RUSSIA_PBF_URL = "https://download.geofabrik.de/russia-latest.osm.pbf"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download an OSM PBF extract.")
    parser.add_argument("--url", default=DEFAULT_RUSSIA_PBF_URL, help="Source .osm.pbf URL.")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/russia-latest.osm.pbf"),
        help="Destination file path.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)

    with urlopen(args.url) as response, args.output.open("wb") as output_file:
        shutil.copyfileobj(response, output_file)

    print(f"Downloaded {args.url} to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
