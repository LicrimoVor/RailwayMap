"""ensure 10km railway sections

Revision ID: 202606280002
Revises: 202606260001
Create Date: 2026-06-28 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
from geoalchemy2 import Geometry
import sqlalchemy as sa

revision: str = "202606280002"
down_revision: Union[str, None] = "202606260001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_exists = "railway_segment_sections_10km" in inspector.get_table_names()

    if not table_exists:
        op.create_table(
            "railway_segment_sections_10km",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "segment_id",
                sa.Integer(),
                sa.ForeignKey("railway_segments.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("section_index", sa.Integer(), nullable=False),
            sa.Column("start_offset_m", sa.Numeric(precision=14, scale=2), nullable=False),
            sa.Column("end_offset_m", sa.Numeric(precision=14, scale=2), nullable=False),
            sa.Column("length_m", sa.Numeric(precision=14, scale=2), nullable=False),
            sa.Column(
                "geometry",
                Geometry(geometry_type="LINESTRING", srid=4326, spatial_index=False),
                nullable=False,
            ),
            sa.UniqueConstraint(
                "segment_id",
                "section_index",
                name="uq_railway_segment_sections_10km_segment_index",
            ),
        )
        op.create_index(
            "ix_railway_segment_sections_10km_segment_id",
            "railway_segment_sections_10km",
            ["segment_id"],
        )
        op.create_index(
            "ix_railway_segment_sections_10km_segment_offsets",
            "railway_segment_sections_10km",
            ["segment_id", "start_offset_m", "end_offset_m"],
        )
        op.create_index(
            "idx_railway_segment_sections_10km_geometry",
            "railway_segment_sections_10km",
            ["geometry"],
            postgresql_using="gist",
        )

    row_count = bind.execute(sa.text("SELECT count(*) FROM railway_segment_sections_10km")).scalar_one()
    if row_count:
        return

    bind.execute(
        sa.text(
            """
            INSERT INTO railway_segment_sections_10km (
                segment_id,
                section_index,
                start_offset_m,
                end_offset_m,
                length_m,
                geometry
            )
            SELECT
                source.segment_id,
                source.section_index,
                round(source.start_m::numeric, 2),
                round(source.end_m::numeric, 2),
                round((source.end_m - source.start_m)::numeric, 2),
                ST_LineSubstring(
                    source.geometry,
                    source.start_m / source.length_m,
                    source.end_m / source.length_m
                )::geometry(LINESTRING, 4326)
            FROM (
                SELECT
                    segment.id AS segment_id,
                    series.section_index,
                    greatest(segment.computed_length_m, 0.0) AS length_m,
                    least(series.section_index * 10000.0, segment.computed_length_m) AS start_m,
                    least((series.section_index + 1) * 10000.0, segment.computed_length_m) AS end_m,
                    segment.geometry
                FROM (
                    SELECT
                        id,
                        geometry,
                        greatest(
                            coalesce(length_m::double precision, ST_Length(geometry::geography)),
                            0.01
                        ) AS computed_length_m
                    FROM railway_segments
                    WHERE geometry IS NOT NULL
                ) AS segment
                CROSS JOIN LATERAL generate_series(
                    0,
                    greatest(ceil(segment.computed_length_m / 10000.0)::integer - 1, 0)
                ) AS series(section_index)
            ) AS source
            WHERE source.end_m > source.start_m
            ON CONFLICT (segment_id, section_index) DO NOTHING
            """
        )
    )


def downgrade() -> None:
    """Do not drop railway section data automatically."""
