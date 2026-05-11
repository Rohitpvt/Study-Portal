"""add google drive fields to classroom material

Revision ID: 12e4d9e683eb
Revises: af14c9a25161
Create Date: 2026-05-05 01:46:21.387905

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '12e4d9e683eb'
down_revision: Union[str, None] = 'af14c9a25161'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Split into multiple blocks to avoid circular dependency issues in batch mode
    with op.batch_alter_table('classroom_materials', schema=None) as batch_op:
        batch_op.add_column(sa.Column('google_drive_file_id', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('google_drive_link', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('google_drive_file_name', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('google_drive_mime_type', sa.String(length=100), nullable=True))

    with op.batch_alter_table('classroom_materials', schema=None) as batch_op:
        batch_op.alter_column('topic_id',
                   existing_type=sa.VARCHAR(length=36),
                   nullable=True)
        batch_op.alter_column('material_id',
                   existing_type=sa.VARCHAR(length=36),
                   nullable=True)

def downgrade() -> None:
    with op.batch_alter_table('classroom_materials', schema=None) as batch_op:
        batch_op.alter_column('material_id',
                   existing_type=sa.VARCHAR(length=36),
                   nullable=False)
        batch_op.alter_column('topic_id',
                   existing_type=sa.VARCHAR(length=36),
                   nullable=False)
        batch_op.drop_column('google_drive_mime_type')
        batch_op.drop_column('google_drive_file_name')
        batch_op.drop_column('google_drive_link')
        batch_op.drop_column('google_drive_file_id')
