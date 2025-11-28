"""add_ros1_registry_support

Добавляет поддержку регистра ROS1:
- Добавляет поле registry_type в таблицу patients
- Устанавливает значение 'ALK' для всех существующих пациентов
- Добавляет ROS1-специфичные поля в таблицу clinical_records

Revision ID: abee23fe8a0f
Revises: 3cc081d1fee7
Create Date: 2025-11-27 13:14:47.141951

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision: str = 'abee23fe8a0f'
down_revision: Union[str, None] = '3cc081d1fee7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### Добавление поля registry_type в таблицу patients ###
    with op.batch_alter_table('patients', schema=None) as batch_op:
        batch_op.add_column(sa.Column('registry_type', sa.String(length=20), nullable=True))
    
    # Устанавливаем значение 'ALK' для всех существующих записей
    op.execute("UPDATE patients SET registry_type = 'ALK' WHERE registry_type IS NULL")
    
    # Делаем поле NOT NULL после заполнения данных
    with op.batch_alter_table('patients', schema=None) as batch_op:
        batch_op.alter_column('registry_type', nullable=False)
    
    # ### Добавление ROS1-специфичных полей в таблицу clinical_records ###
    with op.batch_alter_table('clinical_records', schema=None) as batch_op:
        # ROS1 диагностика
        batch_op.add_column(sa.Column('ros1_fusion_variant', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('pdl1_status', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('pdl1_tps', sa.Integer(), nullable=True))
        
        # Радикальное лечение
        batch_op.add_column(sa.Column('radical_treatment_conducted', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('radical_surgery_conducted', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('radical_surgery_date', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('radical_crt_conducted', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('radical_crt_start_date', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('radical_crt_end_date', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('radical_crt_consolidation', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('radical_crt_consolidation_drug', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('radical_crt_consolidation_end_date', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('radical_perioperative_therapy', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('radical_treatment_outcome', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('relapse_date', sa.DateTime(), nullable=True))
        
        # Метастатическая терапия
        batch_op.add_column(sa.Column('metastatic_therapy_lines', sa.JSON(), nullable=True))


def downgrade() -> None:
    # ### Удаление ROS1-специфичных полей из таблицы clinical_records ###
    with op.batch_alter_table('clinical_records', schema=None) as batch_op:
        batch_op.drop_column('metastatic_therapy_lines')
        batch_op.drop_column('relapse_date')
        batch_op.drop_column('radical_treatment_outcome')
        batch_op.drop_column('radical_perioperative_therapy')
        batch_op.drop_column('radical_crt_consolidation_end_date')
        batch_op.drop_column('radical_crt_consolidation_drug')
        batch_op.drop_column('radical_crt_consolidation')
        batch_op.drop_column('radical_crt_end_date')
        batch_op.drop_column('radical_crt_start_date')
        batch_op.drop_column('radical_crt_conducted')
        batch_op.drop_column('radical_surgery_date')
        batch_op.drop_column('radical_surgery_conducted')
        batch_op.drop_column('radical_treatment_conducted')
        batch_op.drop_column('pdl1_tps')
        batch_op.drop_column('pdl1_status')
        batch_op.drop_column('ros1_fusion_variant')
    
    # ### Удаление поля registry_type из таблицы patients ###
    with op.batch_alter_table('patients', schema=None) as batch_op:
        batch_op.drop_column('registry_type')
