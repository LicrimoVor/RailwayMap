import axios from "axios";

export const apiClient = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
	timeout: 10_000,
});

export function isCanceledRequest(error: unknown): boolean {
	return axios.isCancel(error);
}
