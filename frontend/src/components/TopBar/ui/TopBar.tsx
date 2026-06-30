import {
	Activity,
	Database,
	PanelLeftOpen,
	PanelRightOpen,
	RefreshCw,
	TrainFront,
} from "lucide-react";
import type { TopBarProps } from "../model/types";

export function TopBar({
	isFallback,
	isLoading,
	leftPanelOpen,
	rightPanelOpen,
	rightPanelActiveTab,
	onOpenLeftPanel,
	onOpenRightPanel,
	onOpenElevationPanel,
	onRefresh,
}: TopBarProps) {
	return (
		<header className="pointer-events-auto flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white/95 px-4 shadow-panel backdrop-blur">
			<div className="flex min-w-0 items-center gap-3">
				<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-red-700 text-white">
					<TrainFront size={19} />
				</span>
				<div className="min-w-0">
					<h1 className="truncate text-base font-semibold text-neutral-950">
						Карта железных дорог
					</h1>
					<p className="truncate text-xs text-neutral-600">
						Железные дороги России и связанные объекты
					</p>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-2">
				<button
					type="button"
					aria-label="Открыть панель слоев"
					onClick={onOpenLeftPanel}
					disabled={leftPanelOpen}
					className="inline-flex items-center gap-2 rounded border border-neutral-200 p-2 text-sm text-neutral-800 hover:bg-neutral-100 disabled:cursor-default disabled:opacity-40 sm:px-3"
				>
					<PanelLeftOpen size={15} />
					<span className="hidden sm:inline">Слои</span>
				</button>
				<button
					type="button"
					aria-label="Открыть панель деталей"
					onClick={onOpenRightPanel}
					disabled={rightPanelOpen && rightPanelActiveTab === "details"}
					className="inline-flex items-center gap-2 rounded border border-neutral-200 p-2 text-sm text-neutral-800 hover:bg-neutral-100 disabled:cursor-default disabled:opacity-40 sm:px-3"
				>
					<PanelRightOpen size={15} />
					<span className="hidden sm:inline">Детали</span>
				</button>
				<button
					type="button"
					aria-label="Открыть профиль рельефа"
					onClick={onOpenElevationPanel}
					disabled={rightPanelOpen && rightPanelActiveTab === "elevation"}
					className="inline-flex items-center gap-2 rounded border border-neutral-200 p-2 text-sm text-neutral-800 hover:bg-neutral-100 disabled:cursor-default disabled:opacity-40 sm:px-3"
				>
					<Activity size={15} />
					<span className="hidden sm:inline">Рельеф</span>
				</button>
				<span
					className={`hidden items-center gap-1 rounded px-2 py-1 text-xs md:flex ${
						isFallback
							? "bg-amber-100 text-amber-900"
							: "bg-emerald-100 text-emerald-900"
					}`}
				>
					<Database size={13} />
					{isFallback ? "Демо" : "API"}
				</span>
				<button
					type="button"
					onClick={onRefresh}
					className="inline-flex items-center gap-2 rounded bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-700 disabled:cursor-wait disabled:opacity-70"
					disabled={isLoading}
				>
					<RefreshCw
						size={15}
						className={isLoading ? "animate-spin" : ""}
					/>
					Обновить
				</button>
			</div>
		</header>
	);
}
