import { Database, RefreshCw, TrainFront } from "lucide-react";

type TopBarProps = {
  isFallback: boolean;
  isLoading: boolean;
  onRefresh: () => void;
};

export function TopBar({ isFallback, isLoading, onRefresh }: TopBarProps) {
  return (
    <header className="pointer-events-auto flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white/95 px-4 shadow-panel backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-red-700 text-white">
          <TrainFront size={19} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-neutral-950">Interactive Railway Map</h1>
          <p className="truncate text-xs text-neutral-600">Russia railway graph and linked domain layers</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`hidden items-center gap-1 rounded px-2 py-1 text-xs md:flex ${
            isFallback ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
          }`}
        >
          <Database size={13} />
          {isFallback ? "Demo data" : "API data"}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-700 disabled:cursor-wait disabled:opacity-70"
          disabled={isLoading}
        >
          <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>
    </header>
  );
}
