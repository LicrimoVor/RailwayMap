"""add 10km railway sections

Revision ID: 202606260001
Revises: 202606250002
Create Date: 2026-06-26 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

revision: str = "202606260001"
down_revision: Union[str, None] = "202606250002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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


def downgrade() -> None:
    op.drop_index(
        "idx_railway_segment_sections_10km_geometry",
        table_name="railway_segment_sections_10km",
    )
    op.drop_index(
        "ix_railway_segment_sections_10km_segment_offsets",
        table_name="railway_segment_sections_10km",
    )
    op.drop_index(
        "ix_railway_segment_sections_10km_segment_id",
        table_name="railway_segment_sections_10km",
    )
    op.drop_table("railway_segment_sections_10km")
