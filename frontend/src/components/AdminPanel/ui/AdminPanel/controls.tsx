import { Plus } from "lucide-react";

export function TabButton({
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
      className={`px-3 py-2 ${
        active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
      }`}
    >
      {children}
    </button>
  );
}

export function Input({
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

export function Textarea({
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

export function Submit({ disabled, children }: { disabled: boolean; children: string }) {
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

export function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-neutral-200 bg-neutral-50 px-2 py-2">
      <div className="text-base font-semibold text-neutral-950">{value}</div>
      <div className="text-neutral-500">{label}</div>
    </div>
  );
}
