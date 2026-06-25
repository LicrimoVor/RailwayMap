"""add osm tags and element types

Revision ID: 202606250001
Revises: 202606220001
Create Date: 2026-06-25 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "202606250001"
down_revision: Union[str, None] = "202606220001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "railway_segments",
        sa.Column("osm_type", sa.String(length=16), nullable=False, server_default="way"),
    )
    op.add_column(
        "railway_segments",
        sa.Column(
            "osm_tags",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.drop_constraint("uq_railway_segments_osm_id", "railway_segments", type_="unique")
    op.create_unique_constraint(
        "uq_railway_segments_osm_type_osm_id",
        "railway_segments",
        ["osm_type", "osm_id"],
    )

    op.add_column(
        "stations",
        sa.Column("osm_type", sa.String(length=16), nullable=False, server_default="node"),
    )
    op.add_column(
        "stations",
        sa.Column("railway_type", sa.String(length=64), nullable=False, server_default="station"),
    )
    op.add_column(
        "stations",
        sa.Column(
            "osm_tags",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.drop_constraint("uq_stations_osm_id", "stations", type_="unique")
    op.create_unique_constraint(
        "uq_stations_osm_type_osm_id",
        "stations",
        ["osm_type", "osm_id"],
    )

    op.alter_column("railway_segments", "osm_type", server_default=None)
    op.alter_column("railway_segments", "osm_tags", server_default=None)
    op.alter_column("stations", "osm_type", server_default=None)
    op.alter_column("stations", "railway_type", server_default=None)
    op.alter_column("stations", "osm_tags", server_default=None)


def downgrade() -> None:
    op.drop_constraint("uq_stations_osm_type_osm_id", "stations", type_="unique")
    op.create_unique_constraint("uq_stations_osm_id", "stations", ["osm_id"])
    op.drop_column("stations", "osm_tags")
    op.drop_column("stations", "railway_type")
    op.drop_column("stations", "osm_type")

    op.drop_constraint("uq_railway_segments_osm_type_osm_id", "railway_segments", type_="unique")
    op.create_unique_constraint("uq_railway_segments_osm_id", "railway_segments", ["osm_id"])
    op.drop_column("railway_segments", "osm_tags")
    op.drop_column("railway_segments", "osm_type")
