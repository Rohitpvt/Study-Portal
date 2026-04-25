"""
alembic/script.py.mako
───────────────────────
Template used by `alembic revision` to generate migration files.
This file MUST exist in the alembic directory.
"""

"""Add response_type to chat_messages

Revision ID: bdf0d1b0b2ae
Revises: c1000a8496d7
Create Date: 2026-04-24 01:54:41.740327

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bdf0d1b0b2ae'
down_revision: Union[str, None] = 'c1000a8496d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add response_type column with default 'text'
    op.add_column('chat_messages', sa.Column('response_type', sa.String(length=20), nullable=True))
    op.execute("UPDATE chat_messages SET response_type = 'text'")


def downgrade() -> None:
    op.drop_column('chat_messages', 'response_type')
