import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PanelLeftClose } from "lucide-react";
import type { LayerKey } from "../store/mapStore";
import type { RailwaySummary } from "../types/railway";

type LayerPanelProps = {
  visibleLayers: Record<LayerKey, boolean>;
  onToggleLayer: (key: LayerKey) => void;
  onCollapse: () => void;
  summary: RailwaySummary;
};

const layerRows: Array<{ key: LayerKey; label: string; available: boolean }> = [
  { key: "railways", label: "Railways", available: true },
  { key: "stations", label: "Stations", available: true },
  { key: "electrification", label: "Electrification", available: true },
  { key: "defects", label: "Defects", available: true },
  { key: "speedLimits", label: "Speed limits", available: false },
  { key: "events", label: "User events", available: true },
  { key: "relief", label: "Relief", available: false },
  { key: "heatmaps", label: "Heatmaps", available: false }
];

export function LayerPanel({ visibleLayers, onToggleLayer, onCollapse, summary }: LayerPanelProps) {
  return (
    <aside className="pointer-events-auto w-full rounded-lg border border-neutral-200 bg-white/95 p-3 shadow-panel backdrop-blur md:w-80">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">Layers</h2>
        <div className="flex items-center gap-2">
          <span className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-700">
            {summary.segmentCount} segments
          </span>
          <button
            type="button"
            aria-label="Collapse layers panel"
            onClick={onCollapse}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <PanelLeftClose size={17} />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {layerRows.map((layer) => (
          <label
            key={layer.key}
            className={`flex items-center justify-between rounded px-2 py-2 text-sm ${
              layer.available ? "text-neutral-900 hover:bg-neutral-100" : "text-neutral-400"
            }`}
          >
            <span>{layer.label}</span>
            <input
              type="checkbox"
              checked={visibleLayers[layer.key]}
              disabled={!layer.available}
              onChange={() => onToggleLayer(layer.key)}
              className="h-4 w-4 accent-red-700"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 border-t border-neutral-200 pt-3">
        <div className="mb-2 flex items-center justify-between text-xs text-neutral-600">
          <span>Electrification</span>
          <span>{summary.stationCount} stations</span>
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.electrification} margin={{ left: -24, right: 6, top: 6, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip cursor={{ fill: "#f0f1ed" }} />
              <Bar dataKey="count" fill="#c93535" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </aside>
  );
}
