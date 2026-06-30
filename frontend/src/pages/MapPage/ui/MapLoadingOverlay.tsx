import { memo } from "react";

export const MapLoadingOverlay = memo(
	({
		roadLoading,
		stationLoading,
		defectLoading,
		chunkLoading,
	}: {
		roadLoading: boolean;
		stationLoading: boolean;
		defectLoading: boolean;
		chunkLoading: boolean;
	}) => {
		const steps = [
			{
				key: "road",
				label: "\u0414\u043e\u0440\u043e\u0433\u0438",
				active: roadLoading,
			},
			{
				key: "stations",
				label: "\u0421\u0442\u0430\u043d\u0446\u0438\u0438",
				active: stationLoading,
			},
			{
				key: "defects",
				label: "\u0414\u0435\u0444\u0435\u043a\u0442\u044b",
				active: defectLoading,
			},
			{
				key: "chunks",
				label: "\u0427\u0430\u043d\u043a\u0438 100 \u043c",
				active: chunkLoading,
			},
		];
		const activeSteps = steps.filter((step) => step.active);

		if (activeSteps.length === 0) {
			return null;
		}

		return (
			<div className="pointer-events-none absolute bottom-3 left-1/2 z-10 w-[min(26rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-lg border border-neutral-200 bg-white/95 p-3 shadow-panel backdrop-blur md:bottom-5">
				<div className="space-y-2">
					{steps.map((step) => (
						<div key={step.key} className="flex items-center gap-3">
							<span
								className={`h-2.5 w-2.5 rounded-full ${
									step.active
										? "animate-pulse bg-red-700"
										: "bg-neutral-300"
								}`}
							/>
							<div className="h-2 min-w-0 flex-1 overflow-hidden rounded bg-neutral-100">
								<div
									className={`h-full rounded bg-red-700 transition-all ${
										step.active
											? "w-2/3 animate-pulse"
											: "w-full opacity-25"
									}`}
								/>
							</div>
							<span className="w-28 shrink-0 text-right text-xs text-neutral-700">
								{step.label}
							</span>
						</div>
					))}
				</div>
			</div>
		);
	},
);
