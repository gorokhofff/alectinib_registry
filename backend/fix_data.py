from sqlalchemy import create_engine, text
import os

# Use the database URL from config
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./alectinib_registry.db')
engine = create_engine(DATABASE_URL)

def fix_data():
    with engine.connect() as conn:
        print("1. Cleaning duplicate dictionaries...")
        conn.execute(text("""
            DELETE FROM dictionaries 
            WHERE id NOT IN (
                SELECT MIN(id) 
                FROM dictionaries 
                GROUP BY category, code
            )
        """))
        
        print("2. Restoring Patient Registry Type...")
        # Check if column exists (SQLite specific check)
        try:
            conn.execute(text("SELECT registry_type FROM patients LIMIT 1"))
        except Exception:
            print("   Column missing. Adding registry_type column...")
            conn.execute(text("ALTER TABLE patients ADD COLUMN registry_type VARCHAR(50) DEFAULT 'ALK'"))
        
        # Force update to ALK for nulls (Restoring default state)
        result = conn.execute(text("UPDATE patients SET registry_type = 'ALK' WHERE registry_type IS NULL"))
        print(f"   Updated {result.rowcount} patients to 'ALK' registry.")
        
        conn.commit()
        print("Data restoration complete.")

if __name__ == "__main__":
    fix_data()