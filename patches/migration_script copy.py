"""
Скрипт миграции базы данных для регистра больных раком легкого с ALK мутацией

Выполняет:
1. Добавление новых полей в таблицу clinical_records
2. Миграцию TNM стадий (250 вариантов)
3. Добавление справочников progression_sites и alectinib_progression_type
"""

from sqlalchemy import text
from datetime import datetime


def add_new_columns(session):
    """Добавление новых колонок в таблицу clinical_records"""
    
    columns_to_add = [
        "ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS comorbidities_other_text TEXT;",
        "ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS metastases_sites_other_text TEXT;",
        "ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS progression_sites_other_text TEXT;",
        "ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS alectinib_progression_type VARCHAR(50);",
        "ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS alectinib_progression_sites JSON;",
        "ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS alectinib_progression_sites_other_text TEXT;",
        "ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS alectinib_progression_date TIMESTAMP;",
    ]
    
    for sql in columns_to_add:
        try:
            session.execute(text(sql))
            print(f"✅ Выполнено: {sql[:80]}...")
        except Exception as e:
            print(f"⚠️  Пропущено (возможно уже существует): {sql[:80]}... - {e}")
    
    session.commit()
    print("✅ Добавление новых колонок завершено")


def migrate_tnm_stages(session):
    """Миграция TNM стадий - добавление 250 новых вариантов"""
    
    new_tnm_stages = [
        "TisN0M0", "T1a(mi)N0M0", "T1aN0M0", "T1bN0M0", "T1cN0M0", "T2aN0M0", "T2bN0M0", "T3N0M0", "T4N0M0", "TxN0M0",
        "TisN1M0", "T1a(mi)N1M0", "T1aN1M0", "T1bN1M0", "T1cN1M0", "T2aN1M0", "T2bN1M0", "T3N1M0", "T4N1M0", "TxN1M0",
        "TisN2M0", "T1a(mi)N2M0", "T1aN2M0", "T1bN2M0", "T1cN2M0", "T2aN2M0", "T2bN2M0", "T3N2M0", "T4N2M0", "TxN2M0",
        "TisN3M0", "T1a(mi)N3M0", "T1aN3M0", "T1bN3M0", "T1cN3M0", "T2aN3M0", "T2bN3M0", "T3N3M0", "T4N3M0", "TxN3M0",
        "TisNxM0", "T1a(mi)NxM0", "T1aNxM0", "T1bNxM0", "T1cNxM0", "T2aNxM0", "T2bNxM0", "T3NxM0", "T4NxM0", "TxNxM0",
        "TisN0M1a", "T1a(mi)N0M1a", "T1aN0M1a", "T1bN0M1a", "T1cN0M1a", "T2aN0M1a", "T2bN0M1a", "T3N0M1a", "T4N0M1a", "TxN0M1a",
        "TisN1M1a", "T1a(mi)N1M1a", "T1aN1M1a", "T1bN1M1a", "T1cN1M1a", "T2aN1M1a", "T2bN1M1a", "T3N1M1a", "T4N1M1a", "TxN1M1a",
        "TisN2M1a", "T1a(mi)N2M1a", "T1aN2M1a", "T1bN2M1a", "T1cN2M1a", "T2aN2M1a", "T2bN2M1a", "T3N2M1a", "T4N2M1a", "TxN2M1a",
        "TisN3M1a", "T1a(mi)N3M1a", "T1aN3M1a", "T1bN3M1a", "T1cN3M1a", "T2aN3M1a", "T2bN3M1a", "T3N3M1a", "T4N3M1a", "TxN3M1a",
        "TisNxM1a", "T1a(mi)NxM1a", "T1aNxM1a", "T1bNxM1a", "T1cNxM1a", "T2aNxM1a", "T2bNxM1a", "T3NxM1a", "T4NxM1a", "TxNxM1a",
        "TisN0M1b", "T1a(mi)N0M1b", "T1aN0M1b", "T1bN0M1b", "T1cN0M1b", "T2aN0M1b", "T2bN0M1b", "T3N0M1b", "T4N0M1b", "TxN0M1b",
        "TisN1M1b", "T1a(mi)N1M1b", "T1aN1M1b", "T1bN1M1b", "T1cN1M1b", "T2aN1M1b", "T2bN1M1b", "T3N1M1b", "T4N1M1b", "TxN1M1b",
        "TisN2M1b", "T1a(mi)N2M1b", "T1aN2M1b", "T1bN2M1b", "T1cN2M1b", "T2aN2M1b", "T2bN2M1b", "T3N2M1b", "T4N2M1b", "TxN2M1b",
        "TisN3M1b", "T1a(mi)N3M1b", "T1aN3M1b", "T1bN3M1b", "T1cN3M1b", "T2aN3M1b", "T2bN3M1b", "T3N3M1b", "T4N3M1b", "TxN3M1b",
        "TisNxM1b", "T1a(mi)NxM1b", "T1aNxM1b", "T1bNxM1b", "T1cNxM1b", "T2aNxM1b", "T2bNxM1b", "T3NxM1b", "T4NxM1b", "TxNxM1b",
        "TisN0M1c", "T1a(mi)N0M1c", "T1aN0M1c", "T1bN0M1c", "T1cN0M1c", "T2aN0M1c", "T2bN0M1c", "T3N0M1c", "T4N0M1c", "TxN0M1c",
        "TisN1M1c", "T1a(mi)N1M1c", "T1aN1M1c", "T1bN1M1c", "T1cN1M1c", "T2aN1M1c", "T2bN1M1c", "T3N1M1c", "T4N1M1c", "TxN1M1c",
        "TisN2M1c", "T1a(mi)N2M1c", "T1aN2M1c", "T1bN2M1c", "T1cN2M1c", "T2aN2M1c", "T2bN2M1c", "T3N2M1c", "T4N2M1c", "TxN2M1c",
        "TisN3M1c", "T1a(mi)N3M1c", "T1aN3M1c", "T1bN3M1c", "T1cN3M1c", "T2aN3M1c", "T2bN3M1c", "T3N3M1c", "T4N3M1c", "TxN3M1c",
        "TisNxM1c", "T1a(mi)NxM1c", "T1aNxM1c", "T1bNxM1c", "T1cNxM1c", "T2aNxM1c", "T2bNxM1c", "T3NxM1c", "T4NxM1c", "TxNxM1c"
    ]
    
    print(f"📊 Миграция TNM стадий: обработка {len(new_tnm_stages)} вариантов...")
    
    # Получить существующие TNM записи
    result = session.execute(text(
        "SELECT id, code FROM dictionaries WHERE category = 'tnm_stage'"
    ))
    existing_tnm = {row[1]: row[0] for row in result}
    
    # Деактивировать старые записи, которых нет в новом списке
    deactivated_count = 0
    for code, dict_id in existing_tnm.items():
        if code not in new_tnm_stages:
            session.execute(text(
                "UPDATE dictionaries SET is_active = FALSE WHERE id = :id"
            ), {"id": dict_id})
            deactivated_count += 1
    
    print(f"⚠️  Деактивировано старых записей: {deactivated_count}")
    
    # Добавить новые записи
    added_count = 0
    updated_count = 0
    
    for idx, tnm_code in enumerate(new_tnm_stages, start=1):
        if tnm_code in existing_tnm:
            # Обновить существующую запись
            session.execute(text(
                """UPDATE dictionaries 
                   SET is_active = TRUE, sort_order = :sort_order 
                   WHERE category = 'tnm_stage' AND code = :code"""
            ), {"code": tnm_code, "sort_order": idx})
            updated_count += 1
        else:
            # Добавить новую запись
            session.execute(text(
                """INSERT INTO dictionaries (category, code, value_ru, is_active, sort_order, created_at)
                   VALUES (:category, :code, :value_ru, TRUE, :sort_order, :created_at)"""
            ), {
                "category": "tnm_stage",
                "code": tnm_code,
                "value_ru": tnm_code,
                "sort_order": idx,
                "created_at": datetime.utcnow()
            })
            added_count += 1
    
    session.commit()
    print(f"✅ TNM стадии: добавлено {added_count}, обновлено {updated_count}, деактивировано {deactivated_count}")


def add_progression_dictionaries(session):
    """Добавление новых справочников для прогрессирования"""
    
    # Справочник progression_sites
    progression_sites = [
        ('CNS', 'ЦНС', 1),
        ('BONES', 'Кости', 2),
        ('LIVER', 'Печень', 3),
        ('LUNG', 'Легкое', 4),
        ('PLEURA', 'Плевра', 5),
        ('LYMPH_NODE', 'Лимфоузлы средостения', 6),
        ('ADRENAL', 'Надпочечник', 7),
        ('OTHER', 'Другое', 8),
    ]
    
    added_count = 0
    for code, value_ru, sort_order in progression_sites:
        # Проверить существование
        result = session.execute(text(
            "SELECT id FROM dictionaries WHERE category = 'progression_sites' AND code = :code"
        ), {"code": code})
        
        if result.fetchone() is None:
            session.execute(text(
                """INSERT INTO dictionaries (category, code, value_ru, is_active, sort_order, created_at)
                   VALUES (:category, :code, :value_ru, TRUE, :sort_order, :created_at)"""
            ), {
                "category": "progression_sites",
                "code": code,
                "value_ru": value_ru,
                "sort_order": sort_order,
                "created_at": datetime.utcnow()
            })
            added_count += 1
    
    print(f"✅ Справочник progression_sites: добавлено {added_count} записей")
    
    # Справочник alectinib_progression_type
    progression_types = [
        ('OLIGO', 'Олигопрогрессирование', 1),
        ('SYSTEMIC', 'Системное', 2),
        ('NONE', 'Нет', 3),
    ]
    
    added_count = 0
    for code, value_ru, sort_order in progression_types:
        # Проверить существование
        result = session.execute(text(
            "SELECT id FROM dictionaries WHERE category = 'alectinib_progression_type' AND code = :code"
        ), {"code": code})
        
        if result.fetchone() is None:
            session.execute(text(
                """INSERT INTO dictionaries (category, code, value_ru, is_active, sort_order, created_at)
                   VALUES (:category, :code, :value_ru, TRUE, :sort_order, :created_at)"""
            ), {
                "category": "alectinib_progression_type",
                "code": code,
                "value_ru": value_ru,
                "sort_order": sort_order,
                "created_at": datetime.utcnow()
            })
            added_count += 1
    
    print(f"✅ Справочник alectinib_progression_type: добавлено {added_count} записей")
    
    session.commit()


def run_migration():
    """Запуск всех миграций"""
    from database import SessionLocal
    
    print("=" * 80)
    print("🚀 Начало миграции базы данных для регистра ALK")
    print("=" * 80)
    
    session = SessionLocal()
    
    try:
        print("\n1️⃣  Добавление новых колонок...")
        add_new_columns(session)
        
        print("\n2️⃣  Миграция TNM стадий...")
        migrate_tnm_stages(session)
        
        print("\n3️⃣  Добавление справочников прогрессирования...")
        add_progression_dictionaries(session)
        
        print("\n" + "=" * 80)
        print("✅ Миграция успешно завершена!")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ Ошибка миграции: {e}")
        print("Откат изменений...")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run_migration()
