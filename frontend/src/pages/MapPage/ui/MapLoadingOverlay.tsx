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
			<div className="pointer-events-none absolute bottom-3 left-1/2 z-10 w-[min(22rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-lg border border-neutral-200 bg-white/95 p-3 shadow-panel backdrop-blur md:bottom-5">
				<div className="space-y-3">
					{activeSteps.map((step) => (
						<div
							className="flex items-center max-w-full gap-2"
							key={step.key}
						>
							<p className="shrink-0">{step.label}</p>{" "}
							<div className="animate-pulse h-3 w-full rounded bg-neutral-400" />{" "}
						</div>
					))}
				</div>
			</div>
		);
	},
);
