import type { RailwayChunkProperties } from "../../../types/railway";

export function selectedChunksLength(chunks: RailwayChunkProperties[]): number {
  return chunks.reduce((total, chunk) => total + Number(chunk.length_m || 0), 0);
}
