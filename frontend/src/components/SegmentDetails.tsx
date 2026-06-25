import { PanelRightClose, X } from "lucide-react";
import type { RailwayChunkProperties, RailwaySegmentProperties } from "../types/railway";
import { displayValue, formatLength } from "../features/map/utils";

type SegmentDetailsProps = {
  segment: RailwaySegmentProperties | null;
  selectedChunks: RailwayChunkProperties[];
  onCollapse: () => void;
  onClose: () => void;
};

export function SegmentDetails({ segment, selectedChunks, onCollapse, onClose }: SegmentDetailsProps) {
  const selectedLength = selectedChunks.reduce((total, chunk) => total + Number(chunk.length_m || 0), 0);

  return (
    <aside className="pointer-events-auto flex max-h-full w-full flex-col rounded-lg border border-neutral-200 bg-white/95 shadow-panel backdrop-blur md:w-96">
      <header className="flex items-start justify-between border-b border-neutral-200 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Selected segment</p>
          <h2 className="mt-1 text-lg font-semibold text-neutral-950">
            {segment?.name ?? "No railway selected"}
          </h2>
          {selectedChunks.length > 0 && (
            <p className="mt-1 text-xs text-blue-700">
              {selectedChunks.length} chunks selected, {formatLength(selectedLength)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Collapse details panel"
            onClick={onCollapse}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <PanelRightClose size={18} />
          </button>
          <button
            type="button"
            aria-label="Clear selected segment"
            onClick={onClose}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {segment ? (
        <div className="overflow-y-auto p-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Detail label="Branch" value={segment.branch} />
            <Detail label="Operator" value={segment.operator} />
            <Detail label="Gauge" value={segment.gauge ? `${segment.gauge} mm` : null} />
            <Detail label="Electrified" value={segment.electrified} />
            <Detail label="Voltage" value={segment.voltage ? `${segment.voltage} V` : null} />
            <Detail label="Frequency" value={segment.frequency} />
            <Detail label="Usage" value={segment.usage} />
            <Detail label="Length" value={formatLength(segment.length_m)} />
          </dl>

          <section className="mt-5 space-y-3">
            <EmptyBlock
              title="Selected chunks"
              value={
                selectedChunks.length > 0
                  ? "Blue highlighted 100 m chunks will be used as event geometry."
                  : "Click railway chunks on the map to build an arbitrary selection."
              }
            />
            <EmptyBlock title="Events" value="No linked events loaded" />
            <EmptyBlock title="Defects" value="No defects loaded" />
            <EmptyBlock title="Parameters" value="No extra parameters loaded" />
          </section>
        </div>
      ) : (
        <div className="p-4 text-sm text-neutral-600">Click a railway line to inspect attributes.</div>
      )}
    </aside>
  );
}

function Detail({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded border border-neutral-200 bg-neutral-50 p-2">
      <dt className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="mt-1 break-words text-neutral-950">{displayValue(value)}</dd>
    </div>
  );
}

function EmptyBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded border border-neutral-200 p-3">
      <h3 className="text-sm font-medium text-neutral-900">{title}</h3>
      <p className="mt-1 text-sm text-neutral-500">{value}</p>
    </div>
  );
}
