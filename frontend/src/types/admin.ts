import type {
	Feature,
	FeatureCollection,
	LineStringGeometry,
	MultiLineStringGeometry,
	PointGeometry,
} from "./geojson";

export type EventType = {
	id: number;
	name: string;
	color: string;
	icon?: string | null;
};

export type RailwayEventProperties = {
	id: number;
	event_type_id: number;
	event_type?: EventType;
	event_type_name?: string;
	event_type_color?: string;
	segment_id: number;
	start_km: number;
	start_pk: number;
	end_km?: number | null;
	end_pk?: number | null;
	start_offset?: number | null;
	end_offset?: number | null;
	description?: string | null;
	severity?: string | null;
	created_at?: string;
	updated_at?: string;
};

export type DefectProperties = {
	id: number;
	segment_id: number;
	km: number;
	pk: number;
	type: string;
	description?: string | null;
	severity?: string | null;
	status: string;
	created_at?: string;
};

export type SegmentParameter = {
	id: number;
	segment_id: number;
	name: string;
	value: string;
	unit?: string | null;
	valid_from?: string | null;
	valid_to?: string | null;
};

export type RailwayEventFeature = Feature<
	LineStringGeometry | MultiLineStringGeometry,
	RailwayEventProperties
>;
export type DefectFeature = Feature<PointGeometry, DefectProperties>;

export type RailwayEventCollection = FeatureCollection<RailwayEventFeature>;
export type DefectCollection = FeatureCollection<DefectFeature>;

export type AdminMapData = {
	events: RailwayEventCollection;
	defects: DefectCollection;
};

export type SegmentAdminData = AdminMapData & {
	parameters: SegmentParameter[];
	eventTypes: EventType[];
};

export type CreateEventInput = {
	segment_id: number;
	event_type: {
		name: string;
		color: string;
	};
	start_km: number;
	start_pk: number;
	end_km?: number | null;
	end_pk?: number | null;
	description?: string | null;
	severity?: string | null;
	geometry?: LineStringGeometry | MultiLineStringGeometry;
};

export type CreateDefectInput = {
	segment_id: number;
	km: number;
	pk: number;
	type: string;
	description?: string | null;
	severity?: string | null;
	status: string;
	geometry?: PointGeometry;
};

export type CreateParameterInput = {
	segment_id: number;
	name: string;
	value: string;
	unit?: string | null;
};
