import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check } from "lucide-react";
import {
  createDefect,
  createEvent,
  createSegmentParameter,
  defaultEventType,
  fetchSegmentAdminData
} from "../../../../services/adminApi";
import { selectedChunksToGeometry, selectedChunksToPoint } from "../../libs/chunkGeometry";
import type { AdminPanelProps, AdminPanelTab } from "../../model/types";
import { Counter, TabButton } from "./controls";
import { DefectForm, EventForm, ParameterForm } from "./forms";

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
      queryClient.invalidateQueries({ queryKey: ["admin-map-events"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-map-defects"] }),
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
  const error =
    eventMutation.error ?? defectMutation.error ?? parameterMutation.error ?? segmentQuery.error;

  return (
    <aside className="pointer-events-auto w-full rounded-lg border border-neutral-200 bg-white/95 shadow-panel backdrop-blur md:w-96">
      <header className="border-b border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Администрирование</p>
            <h2 className="mt-1 text-base font-semibold text-neutral-950">
              Данные для участка
            </h2>
            {selectedChunks.length > 0 && (
              <p className="mt-1 text-xs text-blue-700">
                Выбрано участков 100 м: {selectedChunks.length.toLocaleString("ru-RU")}
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
          <p className="text-sm text-neutral-600">
            Сначала выберите участок железной дороги на карте.
          </p>
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
