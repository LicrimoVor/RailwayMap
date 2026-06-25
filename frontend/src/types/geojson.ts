export type Position = [number, number];

export type LineStringGeometry = {
  type: "LineString";
  coordinates: Position[];
};

export type PointGeometry = {
  type: "Point";
  coordinates: Position;
};

export type Feature<TGeometry, TProperties extends Record<string, unknown>> = {
  type: "Feature";
  id?: string | number;
  geometry: TGeometry;
  properties: TProperties;
};

export type FeatureCollection<TFeature> = {
  type: "FeatureCollection";
  features: TFeature[];
};
