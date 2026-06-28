import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Plus } from "lucide-react";
import {
  createDefect,
  createEvent,
  createSegmentParameter,
  defaultEventType,
  fetchSegmentAdminData
} from "../../../services/adminApi";
import { selectedChunksToGeometry, selectedChunksToPoint } from "../libs/chunkGeometry";
import { optionalNumber, toNumber } from "../libs/formNumbers";
import type {
  AdminPanelProps,
  AdminPanelTab,
  DefectGeometry,
  DefectPayload,
  EventGeometry,
  EventPayload
} from "../model/types";

export function AdminPanel({ segment, selectedChunks }: AdminPanelProps) {
  const segmentId = Number(selectedChunks[0]?.segment_id ?? segment?.id);
  const isSegmentSelected = Number.isFinite(segmentId);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminPanelTab>("event");
  const [message, setMessage] = useState<string | null>(null);

  const segmentQuery = useQuery({
    queryKey: ["segment-admin-data", segmentId],
    queryFn: () => fetchSegmentAdminData(segmentId),
    enabled: isSegmentSelected
  });

  const eventType = useMemo(
    () => defaultEventType(segmentQuery.data?.eventTypes ?? []),
    [segmentQuery.data?.eventTypes]
  );

  const onSaved = async (messageText: string) => {
    setMessage(messageText);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-map-data"] }),
      queryClient.invalidateQueries({ queryKey: ["segment-admin-data", segmentId] })
    ]);
  };

  const eventMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => void onSaved("Событие сохранено")
  });
  const defectMutation = useMutation({
    mutationFn: createDefect,
    onSuccess: () => void onSaved("Дефект сохранен")
  });
  const parameterMutation = useMutation({
    mutationFn: createSegmentParameter,
    onSuccess: () => void onSaved("Параметр сохранен")
  });

  const isBusy = eventMutation.isPending || defectMutation.isPending || parameterMutation.isPending;
  const error = eventMutation.error ?? defectMutation.error ?? parameterMutation.error ?? segmentQuery.error;

  return (
    <aside className="pointer-events-auto w-full rounded-lg border border-neutral-200 bg-white/95 shadow-panel backdrop-blur md:w-96">
      <header className="border-b border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Администрирование</p>
            <h2 className="mt-1 text-base font-semibold text-neutral-950">Данные для участка</h2>
            {selectedChunks.length > 0 && (
              <p className="mt-1 text-xs text-blue-700">
                Выбрано 100 м участков: {selectedChunks.length.toLocaleString("ru-RU")}
              </p>
            )}
          </div>
          <span className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-700">
            {isSegmentSelected ? `#${segmentId}` : "Нет выбора"}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-3 border-b border-neutral-200 text-sm">
        <TabButton active={activeTab === "event"} onClick={() => setActiveTab("event")}>
          Событие
        </TabButton>
        <TabButton active={activeTab === "defect"} onClick={() => setActiveTab("defect")}>
          Дефект
        </TabButton>
        <TabButton active={activeTab === "parameter"} onClick={() => setActiveTab("parameter")}>
          Параметр
        </TabButton>
      </div>

      <div className="p-4">
        {!isSegmentSelected ? (
          <p className="text-sm text-neutral-600">Сначала выберите участок железной дороги на карте.</p>
        ) : (
          <>
            {activeTab === "event" && (
              <EventForm
                segmentId={segmentId}
                defaultName={eventType.name}
                defaultColor={eventType.color}
                selectedGeometry={selectedChunksToGeometry(selectedChunks)}
                disabled={isBusy}
                onSubmit={(payload) => eventMutation.mutate(payload)}
              />
            )}
            {activeTab === "defect" && (
              <DefectForm
                segmentId={segmentId}
                selectedGeometry={selectedChunksToPoint(selectedChunks)}
                disabled={isBusy}
                onSubmit={(payload) => defectMutation.mutate(payload)}
              />
            )}
            {activeTab === "parameter" && (
              <ParameterForm
                segmentId={segmentId}
                disabled={isBusy}
                onSubmit={(payload) => parameterMutation.mutate(payload)}
              />
            )}

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <Counter label="События" value={segmentQuery.data?.events.features.length ?? 0} />
              <Counter label="Дефекты" value={segmentQuery.data?.defects.features.length ?? 0} />
              <Counter label="Параметры" value={segmentQuery.data?.parameters.length ?? 0} />
            </div>
          </>
        )}

        {message && (
          <div className="mt-3 flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <Check size={16} />
            {message}
          </div>
        )}
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            <AlertCircle size={16} />
            Запрос к API не выполнен
          </div>
        )}
      </div>
    </aside>
  );
}

function EventForm({
  segmentId,
  defaultName,
  defaultColor,
  selectedGeometry,
  disabled,
  onSubmit
}: {
  segmentId: number;
  defaultName: string;
  defaultColor: string;
  selectedGeometry: EventGeometry;
  disabled: boolean;
  onSubmit: (payload: EventPayload) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [color, setColor] = useState(defaultColor);
  const [startKm, setStartKm] = useState("0");
  const [startPk, setStartPk] = useState("0");
  const [endKm, setEndKm] = useState("");
  const [endPk, setEndPk] = useState("");
  const [severity, setSeverity] = useState("предупреждение");
  const [description, setDescription] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          segment_id: segmentId,
          event_type: { name, color },
          start_km: toNumber(startKm),
          start_pk: toNumber(startPk),
          end_km: optionalNumber(endKm),
          end_pk: optionalNumber(endPk),
          severity,
          description: description || null,
          geometry: selectedGeometry
        });
      }}
    >
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Input label="Тип" value={name} onChange={setName} />
        <label className="block text-xs text-neutral-600">
          Цвет
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="mt-1 h-10 w-12 rounded border border-neutral-300 bg-white"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Начало, км" value={startKm} onChange={setStartKm} type="number" />
        <Input label="Начало, пикет" value={startPk} onChange={setStartPk} type="number" />
        <Input label="Конец, км" value={endKm} onChange={setEndKm} type="number" />
        <Input label="Конец, пикет" value={endPk} onChange={setEndPk} type="number" />
      </div>
      <Input label="Важность" value={severity} onChange={setSeverity} />
      <Textarea label="Описание" value={description} onChange={setDescription} />
      <Submit disabled={disabled}>Создать событие</Submit>
    </form>
  );
}

function DefectForm({
  segmentId,
  selectedGeometry,
  disabled,
  onSubmit
}: {
  segmentId: number;
  selectedGeometry: DefectGeometry;
  disabled: boolean;
  onSubmit: (payload: DefectPayload) => void;
}) {
  const [type, setType] = useState("Дефект пути");
  const [km, setKm] = useState("0");
  const [pk, setPk] = useState("0");
  const [severity, setSeverity] = useState("критический");
  const [description, setDescription] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          segment_id: segmentId,
          type,
          km: toNumber(km),
          pk: toNumber(pk),
          severity,
          description: description || null,
          status: "open",
          geometry: selectedGeometry
        });
      }}
    >
      <Input label="Тип" value={type} onChange={setType} />
      <div className="grid grid-cols-2 gap-2">
        <Input label="Км" value={km} onChange={setKm} type="number" />
        <Input label="Пикет" value={pk} onChange={setPk} type="number" />
      </div>
      <Input label="Важность" value={severity} onChange={setSeverity} />
      <Textarea label="Описание" value={description} onChange={setDescription} />
      <Submit disabled={disabled}>Создать дефект</Submit>
    </form>
  );
}

function ParameterForm({
  segmentId,
  disabled,
  onSubmit
}: {
  segmentId: number;
  disabled: boolean;
  onSubmit: (payload: any) => void;
}) {
  const [name, setName] = useState("Ограничение скорости");
  const [value, setValue] = useState("80");
  const [unit, setUnit] = useState("км/ч");

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          segment_id: segmentId,
          name,
          value,
          unit: unit || null
        });
      }}
    >
      <Input label="Название" value={name} onChange={setName} />
      <div className="grid grid-cols-2 gap-2">
        <Input label="Значение" value={value} onChange={setValue} />
        <Input label="Единица" value={unit} onChange={setUnit} />
      </div>
      <Submit disabled={disabled}>Создать параметр</Submit>
    </form>
  );
}

function TabButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 ${active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
    >
      {children}
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-xs text-neutral-600">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-950 outline-none focus:border-neutral-900"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs text-neutral-600">
      {label}
      <textarea
        value={value}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full resize-none rounded border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-950 outline-none focus:border-neutral-900"
      />
    </label>
  );
}

function Submit({ disabled, children }: { disabled: boolean; children: string }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-wait disabled:opacity-70"
    >
      <Plus size={16} />
      {children}
    </button>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-neutral-200 bg-neutral-50 px-2 py-2">
      <div className="text-base font-semibold text-neutral-950">{value}</div>
      <div className="text-neutral-500">{label}</div>
    </div>
  );
}
