import sqlite3
import os

# Путь к вашей базе данных
DB_PATH = "./alectinib_registry.db"

def migrate():
    print(f"Connecting to database at {DB_PATH}...")
    
    if not os.path.exists(DB_PATH):
        print("❌ Database file not found! Run init_db.py first.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # --- 1. Миграция таблицы dictionaries (добавляем parent) ---
        print("\nChecking 'dictionaries' table...")
        cursor.execute("PRAGMA table_info(dictionaries)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'parent' not in columns:
            print("  ➕ Adding column 'parent'...")
            cursor.execute("ALTER TABLE dictionaries ADD COLUMN parent VARCHAR(100)")
        else:
            print("  ✓ Column 'parent' already exists")

        # --- 2. Миграция таблицы patients (добавляем registry_type) ---
        print("\nChecking 'patients' table...")
        cursor.execute("PRAGMA table_info(patients)")
        columns = [info[1] for info in cursor.fetchall()]

        if 'registry_type' not in columns:
            print("  ➕ Adding column 'registry_type'...")
            # Добавляем колонку с дефолтным значением
            cursor.execute("ALTER TABLE patients ADD COLUMN registry_type VARCHAR(50) DEFAULT 'alectinib'")
            
            # Создаем индекс для новой колонки
            print("  ➕ Creating index for 'registry_type'...")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_patients_registry_type ON patients (registry_type)")
        else:
            print("  ✓ Column 'registry_type' already exists")

        # --- 3. Исправление дубликатов в словарях (если были) ---
        # Сначала находим дубликаты (category + code), оставляя только с минимальным ID
        print("\nCleaning up potential duplicates in dictionaries...")
        cursor.execute("""
            DELETE FROM dictionaries 
            WHERE id NOT IN (
                SELECT MIN(id) 
                FROM dictionaries 
                GROUP BY category, code
            )
        """)
        if cursor.rowcount > 0:
            print(f"  🗑️ Deleted {cursor.rowcount} duplicate dictionary entries")
        else:
            print("  ✓ No duplicates found")

        # Создаем уникальный индекс, чтобы предотвратить дубликаты в будущем
        try:
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS uix_dictionary_category_code ON dictionaries (category, code)")
            print("  ✓ Unique constraint ensured")
        except sqlite3.OperationalError:
            # Индекс может уже существовать под другим именем или возник конфликт
            print("  ⚠ Could not create unique index (might already exist)")

        conn.commit()
        print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()