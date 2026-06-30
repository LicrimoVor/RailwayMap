import { useEffect, useMemo, useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { formatLength } from "../../../libs/railway";
import {
	buildElevationProfile,
	type ElevationProfilePoint,
	type ElevationProfileResult,
} from "../libs/elevationProfile";
import type { ElevationProfileProps } from "../model/types";

type ProfileState =
	| { status: "idle"; profile: null; error: null }
	| { status: "loading"; profile: null; error: null }
	| { status: "ready"; profile: ElevationProfileResult; error: null }
	| { status: "error"; profile: null; error: string };

const initialState: ProfileState = {
	status: "idle",
	profile: null,
	error: null,
};

export function ElevationProfile({ feature }: ElevationProfileProps) {
	const [state, setState] = useState<ProfileState>(initialState);

	useEffect(() => {
		if (!feature) {
			setState(initialState);
			return;
		}

		const controller = new AbortController();
		setState({ status: "loading", profile: null, error: null });

		void buildElevationProfile(feature, controller.signal)
			.then((profile) => {
				if (!controller.signal.aborted) {
					setState({ status: "ready", profile, error: null });
				}
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted) {
					return;
				}

				setState({
					status: "error",
					profile: null,
					error:
						error instanceof Error
							? error.message
							: "Не удалось построить профиль рельефа",
				});
			});

		return () => controller.abort();
	}, [feature]);

	if (!feature) {
		return (
			<div className="p-4 text-sm text-neutral-600">
				Выберите участок железной дороги на карте, чтобы построить профиль
				рельефа.
			</div>
		);
	}

	if (state.status === "loading") {
		return <ProfileSkeleton />;
	}

	if (state.status === "error") {
		return (
			<div className="space-y-2 p-4 text-sm">
				<p className="font-medium text-neutral-900">
					Профиль рельефа не построен
				</p>
				<p className="text-neutral-600">{state.error}</p>
			</div>
		);
	}

	if (!state.profile || state.profile.points.length === 0) {
		return (
			<div className="p-4 text-sm text-neutral-600">
				Для выбранного участка недостаточно геометрии.
			</div>
		);
	}

	return <ProfileChart profile={state.profile} />;
}

function ProfileChart({ profile }: { profile: ElevationProfileResult }) {
	const hasElevationData = useMemo(
		() => profile.points.some((point) => Number.isFinite(point.elevationM)),
		[profile.points],
	);

	return (
		<div className="space-y-4 p-4">
			<div className="grid grid-cols-2 gap-2 text-sm">
				<Stat label="Длина" value={formatLength(profile.stats.totalDistanceM)} />
				<Stat label="Мин." value={formatElevation(profile.stats.minElevationM)} />
				<Stat label="Макс." value={formatElevation(profile.stats.maxElevationM)} />
				<Stat
					label="Набор"
					value={`+${formatElevation(profile.stats.elevationGainM)}`}
				/>
				<Stat
					label="Сброс"
					value={`-${formatElevation(profile.stats.elevationLossM)}`}
				/>
				<Stat
					label="Точек"
					value={profile.stats.sampleCount.toLocaleString("ru-RU")}
				/>
			</div>

			{hasElevationData ? (
				<div className="h-64 rounded border border-neutral-200 bg-white p-2">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart
							data={profile.points}
							margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
						>
							<CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" />
							<XAxis
								dataKey="distanceKm"
								type="number"
								domain={[0, "dataMax"]}
								tickFormatter={(value) => `${formatAxisNumber(value)} км`}
								tick={{ fontSize: 11, fill: "#525252" }}
								stroke="#a3a3a3"
							/>
							<YAxis
								width={42}
								domain={[
									(value: number) => Math.floor(value - 20),
									(value: number) => Math.ceil(value + 20),
								]}
								tickFormatter={(value) => `${Math.round(value)} м`}
								tick={{ fontSize: 11, fill: "#525252" }}
								stroke="#a3a3a3"
							/>
							<Tooltip content={<ElevationTooltip />} />
							<Area
								type="monotone"
								dataKey="elevationM"
								stroke="#a16207"
								strokeWidth={2}
								fill="#facc15"
								fillOpacity={0.28}
								connectNulls
								dot={false}
								isAnimationActive={false}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			) : (
				<div className="rounded border border-neutral-200 p-3 text-sm text-neutral-600">
					Высоты для выбранного участка не найдены.
				</div>
			)}

			{profile.stats.failedSamples > 0 && (
				<p className="text-xs text-neutral-500">
					Без высоты: {profile.stats.failedSamples.toLocaleString("ru-RU")} из{" "}
					{profile.stats.sampleCount.toLocaleString("ru-RU")} точек.
				</p>
			)}
		</div>
	);
}

function ElevationTooltip({
	active,
	payload,
}: {
	active?: boolean;
	payload?: Array<{ payload: ElevationProfilePoint }>;
}) {
	if (!active || !payload?.[0]) {
		return null;
	}

	const point = payload[0].payload;

	return (
		<div className="rounded border border-neutral-200 bg-white px-3 py-2 text-xs shadow-panel">
			<p className="font-medium text-neutral-900">
				{point.distanceKm.toLocaleString("ru-RU", {
					maximumFractionDigits: 2,
				})}{" "}
				км
			</p>
			<p className="text-neutral-600">
				Высота: {formatElevation(point.elevationM)}
			</p>
		</div>
	);
}

function ProfileSkeleton() {
	return (
		<div className="space-y-4 p-4">
			<div>
				<p className="text-sm font-medium text-neutral-900">
					Загружается профиль рельефа
				</p>
				<p className="mt-1 text-sm text-neutral-500">
					Получаем высоты вдоль выбранного участка.
				</p>
			</div>
			<div className="grid grid-cols-2 gap-2">
				{Array.from({ length: 6 }).map((_, index) => (
					<div
						key={index}
						className="h-14 animate-pulse rounded border border-neutral-200 bg-neutral-100"
					/>
				))}
			</div>
			<div className="h-64 animate-pulse rounded border border-neutral-200 bg-neutral-100" />
		</div>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded border border-neutral-200 bg-neutral-50 p-2">
			<p className="text-[11px] uppercase tracking-wide text-neutral-500">
				{label}
			</p>
			<p className="mt-1 text-sm font-medium text-neutral-950">{value}</p>
		</div>
	);
}

function formatElevation(value: number | null): string {
	if (value === null || !Number.isFinite(value)) {
		return "н/д";
	}

	return `${Math.round(value).toLocaleString("ru-RU")} м`;
}

function formatAxisNumber(value: number | string): string {
	const numberValue = Number(value);

	if (!Number.isFinite(numberValue)) {
		return "";
	}

	return numberValue.toLocaleString("ru-RU", {
		maximumFractionDigits: numberValue >= 10 ? 0 : 1,
	});
}
