import { useState } from "react";
import { optionalNumber, toNumber } from "../../libs/formNumbers";
import type {
  DefectGeometry,
  DefectPayload,
  EventGeometry,
  EventPayload,
  ParameterPayload
} from "../../model/types";
import { Input, Submit, Textarea } from "./controls";

type BaseFormProps = {
  segmentId: number;
  disabled: boolean;
};

export function EventForm({
  segmentId,
  defaultName,
  defaultColor,
  selectedGeometry,
  disabled,
  onSubmit
}: BaseFormProps & {
  defaultName: string;
  defaultColor: string;
  selectedGeometry: EventGeometry;
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

export function DefectForm({
  segmentId,
  selectedGeometry,
  disabled,
  onSubmit
}: BaseFormProps & {
  selectedGeometry: DefectGeometry;
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

export function ParameterForm({
  segmentId,
  disabled,
  onSubmit
}: BaseFormProps & {
  onSubmit: (payload: ParameterPayload) => void;
}) {
  const [name, setName] = useState("Ограничение скорости");
  const [value, setValue] = useState("80");
  const [unit, setUnit] = useState("км/ч");

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ segment_id: segmentId, name, value, unit: unit || null });
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
