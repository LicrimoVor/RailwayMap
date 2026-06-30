import type { LayerKey } from "../../../store/mapStore";

export const layerRows: Array<{ key: LayerKey; label: string }> = [
  { key: "railways", label: "\u0416\u0435\u043b\u0435\u0437\u043d\u044b\u0435 \u0434\u043e\u0440\u043e\u0433\u0438" },
  { key: "electrification", label: "\u042d\u043b\u0435\u043a\u0442\u0440\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u044f" },
  { key: "stations", label: "\u0421\u0442\u0430\u043d\u0446\u0438\u0438" },
  { key: "defects", label: "\u0414\u0435\u0444\u0435\u043a\u0442\u044b" }
];
