declare module "maplibre-gl-opacity" {
	import type { IControl, Map } from "maplibre-gl";

	type OpacityControlOptions = {
		baseLayers: Record<string, string>;
		overLayers: Record<string, string>;
		opacityControl: boolean;
	};

	export default class OpacityControl implements IControl {
		constructor(options: Partial<OpacityControlOptions>);
		onAdd(map: Map): HTMLElement;
		onRemove(): void;
	}
}
