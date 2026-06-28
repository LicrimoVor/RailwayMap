import { PanelLeftClose } from "lucide-react";

import { layerRows } from "../libs/layers";
import type { LayerPanelProps } from "../model/types";

export function LayerPanel({
  visibleLayers,
  onToggleLayer,
  onCollapse,
  summary: _summary
}: LayerPanelProps) {
  return (
    <aside className="pointer-events-auto w-full rounded-lg border border-neutral-200 bg-white/95 p-3 shadow-panel backdrop-blur md:w-80">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
          {"\u0421\u043b\u043e\u0438"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={"\u0421\u0432\u0435\u0440\u043d\u0443\u0442\u044c \u043f\u0430\u043d\u0435\u043b\u044c \u0441\u043b\u043e\u0435\u0432"}
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
            className="flex items-center justify-between rounded px-2 py-2 text-sm text-neutral-900 hover:bg-neutral-100"
          >
            <span>{layer.label}</span>
            <input
              type="checkbox"
              checked={visibleLayers[layer.key]}
              onChange={() => onToggleLayer(layer.key)}
              className="h-4 w-4 accent-red-700"
            />
          </label>
        ))}
      </div>
    </aside>
  );
}
