"""create stage 1 schema

Revision ID: 202606220001
Revises:
Create Date: 2026-06-22 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

revision: str = "202606220001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "railway_segments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("osm_id", sa.BigInteger(), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("branch", sa.String(length=255), nullable=True),
        sa.Column("operator", sa.String(length=255), nullable=True),
        sa.Column("gauge", sa.Integer(), nullable=True),
        sa.Column("electrified", sa.String(length=64), nullable=True),
        sa.Column("voltage", sa.Integer(), nullable=True),
        sa.Column("frequency", sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column("usage", sa.String(length=64), nullable=True),
        sa.Column("railway_type", sa.String(length=64), nullable=False, server_default="rail"),
        sa.Column("passenger_lines", sa.Integer(), nullable=True),
        sa.Column("length_m", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column(
            "geometry",
            Geometry(geometry_type="LINESTRING", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("osm_id", name="uq_railway_segments_osm_id"),
    )
    op.create_index("ix_railway_segments_osm_id", "railway_segments", ["osm_id"])
    op.create_index(
        "idx_railway_segments_geometry",
        "railway_segments",
        ["geometry"],
        postgresql_using="gist",
    )

    op.create_table(
        "stations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("osm_id", sa.BigInteger(), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("esr_code", sa.String(length=32), nullable=True),
        sa.Column(
            "geometry",
            Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.UniqueConstraint("osm_id", name="uq_stations_osm_id"),
    )
    op.create_index("ix_stations_osm_id", "stations", ["osm_id"])
    op.create_index("idx_stations_geometry", "stations", ["geometry"], postgresql_using="gist")

    op.create_table(
        "cities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("population", sa.Integer(), nullable=True),
        sa.Column(
            "geometry",
            Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=False,
        ),
    )
    op.create_index("ix_cities_name", "cities", ["name"])
    op.create_index("idx_cities_geometry", "cities", ["geometry"], postgresql_using="gist")

    op.create_table(
        "event_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("color", sa.String(length=32), nullable=False),
        sa.Column("icon", sa.String(length=64), nullable=True),
        sa.UniqueConstraint("name", name="uq_event_types_name"),
    )

    op.create_table(
        "layers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("color", sa.String(length=32), nullable=False),
        sa.Column("visible", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("name", name="uq_layers_name"),
    )

    op.create_table(
        "kilometer_points",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("segment_id", sa.Integer(), sa.ForeignKey("railway_segments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("km", sa.Integer(), nullable=False),
        sa.Column("pk", sa.Integer(), nullable=False),
        sa.Column("offset_m", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "geometry",
            Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.UniqueConstraint("segment_id", "km", "pk", name="uq_kilometer_points_segment_km_pk"),
    )
    op.create_index("ix_kilometer_points_segment_id", "kilometer_points", ["segment_id"])
    op.create_index("ix_kilometer_points_km_pk", "kilometer_points", ["km", "pk"])
    op.create_index(
        "idx_kilometer_points_geometry",
        "kilometer_points",
        ["geometry"],
        postgresql_using="gist",
    )

    op.create_table(
        "railway_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_type_id", sa.Integer(), sa.ForeignKey("event_types.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("segment_id", sa.Integer(), sa.ForeignKey("railway_segments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("start_km", sa.Integer(), nullable=False),
        sa.Column("start_pk", sa.Integer(), nullable=False),
        sa.Column("end_km", sa.Integer(), nullable=True),
        sa.Column("end_pk", sa.Integer(), nullable=True),
        sa.Column("start_offset", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("end_offset", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column(
            "geometry",
            Geometry(geometry_type="LINESTRING", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_railway_events_segment_id", "railway_events", ["segment_id"])
    op.create_index("ix_railway_events_event_type_id", "railway_events", ["event_type_id"])
    op.create_index("idx_railway_events_geometry", "railway_events", ["geometry"], postgresql_using="gist")

    op.create_table(
        "segment_parameters",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("segment_id", sa.Integer(), sa.ForeignKey("railway_segments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("value", sa.String(length=255), nullable=False),
        sa.Column("unit", sa.String(length=32), nullable=True),
        sa.Column("valid_from", sa.Date(), nullable=True),
        sa.Column("valid_to", sa.Date(), nullable=True),
    )
    op.create_index("ix_segment_parameters_segment_id", "segment_parameters", ["segment_id"])
    op.create_index("ix_segment_parameters_name", "segment_parameters", ["name"])

    op.create_table(
        "defects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("segment_id", sa.Integer(), sa.ForeignKey("railway_segments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("km", sa.Integer(), nullable=False),
        sa.Column("pk", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(length=32), nullable=True),
        sa.Column(
            "geometry",
            Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_defects_segment_id", "defects", ["segment_id"])
    op.create_index("ix_defects_km_pk", "defects", ["km", "pk"])
    op.create_index("idx_defects_geometry", "defects", ["geometry"], postgresql_using="gist")


def downgrade() -> None:
    op.drop_index("idx_defects_geometry", table_name="defects")
    op.drop_index("ix_defects_km_pk", table_name="defects")
    op.drop_index("ix_defects_segment_id", table_name="defects")
    op.drop_table("defects")

    op.drop_index("ix_segment_parameters_name", table_name="segment_parameters")
    op.drop_index("ix_segment_parameters_segment_id", table_name="segment_parameters")
    op.drop_table("segment_parameters")

    op.drop_index("idx_railway_events_geometry", table_name="railway_events")
    op.drop_index("ix_railway_events_event_type_id", table_name="railway_events")
    op.drop_index("ix_railway_events_segment_id", table_name="railway_events")
    op.drop_table("railway_events")

    op.drop_index("idx_kilometer_points_geometry", table_name="kilometer_points")
    op.drop_index("ix_kilometer_points_km_pk", table_name="kilometer_points")
    op.drop_index("ix_kilometer_points_segment_id", table_name="kilometer_points")
    op.drop_table("kilometer_points")

    op.drop_table("layers")
    op.drop_table("event_types")

    op.drop_index("idx_cities_geometry", table_name="cities")
    op.drop_index("ix_cities_name", table_name="cities")
    op.drop_table("cities")

    op.drop_index("idx_stations_geometry", table_name="stations")
    op.drop_index("ix_stations_osm_id", table_name="stations")
    op.drop_table("stations")

    op.drop_index("idx_railway_segments_geometry", table_name="railway_segments")
    op.drop_index("ix_railway_segments_osm_id", table_name="railway_segments")
    op.drop_table("railway_segments")
