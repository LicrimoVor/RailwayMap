export function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function optionalNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  return toNumber(value);
}
