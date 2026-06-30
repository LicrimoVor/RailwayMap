import { apiClient } from "../api";
import { PAGE_SIZE } from "./constants";

export type ApiCollection<T> =
	| T[]
	| { items?: T[]; features?: T[]; type?: string };

export async function fetchCollection(
	endpoint: string,
	params: Record<string, number> = {},
): Promise<ApiCollection<Record<string, unknown>>> {
	const rows: Record<string, unknown>[] = [];
	let offset = 0;
	let isGeoJson = false;

	while (true) {
		const response = await apiClient.get(endpoint, {
			params: { ...params, limit: PAGE_SIZE, offset },
		});
		const payload = response.data as ApiCollection<Record<string, unknown>>;
		const pageRows = collectionRows(payload);
		isGeoJson ||= isFeatureCollection(payload);
		rows.push(...pageRows);

		if (pageRows.length < PAGE_SIZE) {
			break;
		}
		offset += PAGE_SIZE;
	}

	return isGeoJson ? { type: "FeatureCollection", features: rows } : rows;
}

export function collectionRows(
	payload: ApiCollection<Record<string, unknown>>,
): Record<string, unknown>[] {
	if (Array.isArray(payload)) {
		return payload;
	}
	return payload.items ?? payload.features ?? [];
}

export function isFeatureCollection(
	payload: unknown,
): payload is { type: "FeatureCollection" } {
	return typeof payload === "object" && payload !== null && "type" in payload;
}
