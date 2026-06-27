import { AlertTriangle } from "lucide-react";

type StatusBarProps = {
  isFallback: boolean;
  error: unknown;
};

export function StatusBar({ isFallback, error }: StatusBarProps) {
  if (!isFallback || !error) {
    return null;
  }

  return (
    <div className="pointer-events-auto rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 shadow-panel">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} />
        <span>Backend недоступен. Показаны демонстрационные данные железных дорог.</span>
      </div>
    </div>
  );
}
