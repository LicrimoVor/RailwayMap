import { PanelRightClose, X } from "lucide-react";
import { displayValue, formatLength } from "../../../libs/railway";
import { selectedChunksLength } from "../libs/selection";
import type { SegmentDetailsProps } from "../model/types";

export function SegmentDetails({
  segment,
  selectedChunks,
  onCollapse,
  onClose
}: SegmentDetailsProps) {
  const selectedLength = selectedChunksLength(selectedChunks);

  return (
    <aside className="pointer-events-auto flex max-h-full w-full flex-col rounded-lg border border-neutral-200 bg-white/95 shadow-panel backdrop-blur md:w-96">
      <header className="flex items-start justify-between border-b border-neutral-200 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Выбранный участок</p>
          <h2 className="mt-1 text-lg font-semibold text-neutral-950">
            {segment?.name ?? "Железная дорога не выбрана"}
          </h2>
          {selectedChunks.length > 0 && (
            <p className="mt-1 text-xs text-blue-700">
              Выбрано участков 100 м: {selectedChunks.length.toLocaleString("ru-RU")},{" "}
              {formatLength(selectedLength)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Свернуть панель деталей"
            onClick={onCollapse}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <PanelRightClose size={18} />
          </button>
          <button
            type="button"
            aria-label="Очистить выбор"
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
            <Detail label="Ветка" value={segment.branch} />
            <Detail label="Оператор" value={segment.operator} />
            <Detail label="Колея" value={segment.gauge ? `${segment.gauge} мм` : null} />
            <Detail label="Электрификация" value={segment.electrified} />
            <Detail label="Напряжение" value={segment.voltage ? `${segment.voltage} В` : null} />
            <Detail label="Частота" value={segment.frequency} />
            <Detail label="Назначение" value={segment.usage} />
            <Detail label="Длина" value={formatLength(segment.length_m)} />
          </dl>

          <section className="mt-5 space-y-3">
            <EmptyBlock
              title="Выбранные участки 100 м"
              value={
                selectedChunks.length > 0
                  ? "Подсвеченные синим участки будут использованы как геометрия события."
                  : "Нажмите на загруженные участки 100 м на карте, чтобы собрать произвольный фрагмент."
              }
            />
            <EmptyBlock title="События" value="Связанные события не загружены" />
            <EmptyBlock title="Дефекты" value="Дефекты не загружены" />
            <EmptyBlock title="Параметры" value="Дополнительные параметры не загружены" />
          </section>
        </div>
      ) : (
        <div className="p-4 text-sm text-neutral-600">
          Нажмите на железную дорогу, чтобы посмотреть атрибуты.
        </div>
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
