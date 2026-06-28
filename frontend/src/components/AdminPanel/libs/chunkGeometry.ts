import type { LineStringGeometry, MultiLineStringGeometry, PointGeometry } from "../../../types/geojson";
import type { RailwayChunkProperties } from "../../../types/railway";

export function selectedChunksToGeometry(
  chunks: RailwayChunkProperties[]
): LineStringGeometry | MultiLineStringGeometry | undefined {
  const geometries = chunks
    .map((chunk) => getChunkGeometry(chunk))
    .filter((geometry): geometry is LineStringGeometry => geometry !== undefined);

  if (geometries.length === 0) {
    return undefined;
  }
  if (geometries.length === 1) {
    return geometries[0];
  }
  return {
    type: "MultiLineString",
    coordinates: geometries.map((geometry) => geometry.coordinates)
  };
}

export function selectedChunksToPoint(chunks: RailwayChunkProperties[]): PointGeometry | undefined {
  const geometry = getChunkGeometry(chunks[0]);
  if (!geometry || geometry.coordinates.length === 0) {
    return undefined;
  }
  const coordinate = geometry.coordinates[Math.floor(geometry.coordinates.length / 2)];
  return { type: "Point", coordinates: coordinate };
}

function getChunkGeometry(chunk: RailwayChunkProperties | undefined): LineStringGeometry | undefined {
  const maybeGeometry = (chunk as RailwayChunkProperties & { geometry?: LineStringGeometry } | undefined)?.geometry;
  return maybeGeometry?.type === "LineString" ? maybeGeometry : undefined;
}
