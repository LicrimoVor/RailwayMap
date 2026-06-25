"""add selectable railway segment chunks

Revision ID: 202606250002
Revises: 202606250001
Create Date: 2026-06-25 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

revision: str = "202606250002"
down_revision: Union[str, None] = "202606250001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "railway_events",
        "geometry",
        type_=Geometry(geometry_type="GEOMETRY", srid=4326, spatial_index=False),
        postgresql_using="geometry::geometry(GEOMETRY,4326)",
        existing_nullable=False,
    )

    op.create_table(
        "railway_segment_chunks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "segment_id",
            sa.Integer(),
            sa.ForeignKey("railway_segments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("start_offset_m", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("end_offset_m", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("length_m", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "geometry",
            Geometry(geometry_type="LINESTRING", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.UniqueConstraint("segment_id", "chunk_index", name="uq_railway_segment_chunks_segment_index"),
    )
    op.create_index("ix_railway_segment_chunks_segment_id", "railway_segment_chunks", ["segment_id"])
    op.create_index(
        "ix_railway_segment_chunks_segment_offsets",
        "railway_segment_chunks",
        ["segment_id", "start_offset_m", "end_offset_m"],
    )
    op.create_index(
        "idx_railway_segment_chunks_geometry",
        "railway_segment_chunks",
        ["geometry"],
        postgresql_using="gist",
    )


def downgrade() -> None:
    op.drop_index("idx_railway_segment_chunks_geometry", table_name="railway_segment_chunks")
    op.drop_index("ix_railway_segment_chunks_segment_offsets", table_name="railway_segment_chunks")
    op.drop_index("ix_railway_segment_chunks_segment_id", table_name="railway_segment_chunks")
    op.drop_table("railway_segment_chunks")

    op.alter_column(
        "railway_events",
        "geometry",
        type_=Geometry(geometry_type="LINESTRING", srid=4326, spatial_index=False),
        postgresql_using="geometry::geometry(LINESTRING,4326)",
        existing_nullable=False,
    )
