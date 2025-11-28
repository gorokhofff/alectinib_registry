import sqlite3
from datetime import datetime

# Подключаемся к базе данных
conn = sqlite3.connect('alectinib_registry.db')
cursor = conn.cursor()

try:
    # Инактивируем все старые записи comorbidities кроме "Другое"
    cursor.execute("""
        UPDATE dictionaries 
        SET is_active = 0 
        WHERE category = 'comorbidities' AND code != 'OTHER'
    """)
    
    # Новые записи
    new_comorbidities = [
        ('HYPERTENSION', 'I10-15 Гипертензия', 1),
        ('ANGINA', 'I20 Стенокардия', 2),
        ('MYOCARDIAL_INFARCTION', 'I21-22 Инфаркт миокарда', 3),
        ('ISCHEMIC_HEART_DISEASE', 'I24-25 Ишемическая болезнь сердца', 4),
        ('HEART_FAILURE', 'I50 Сердечная недостаточность', 5),
        ('CEREBROVASCULAR_DISEASES', 'I60-69 Цереброваскулярные болезни', 6),
        ('ARTERIAL_DISEASES', 'I70-79 Болезни артерий, артериол и капилляров', 7),
        ('VENOUS_DISEASES', 'I80-87 Болезни вен', 8),
        ('CIRCULATORY_COMPLICATIONS', 'I97 Нарушения системы кровообращения после медицинских процедур, не классифицированные в других рубриках', 9),
        ('CARDIAC_IMPLANTS', 'Z95.5 Наличие сердечных и сосудистых имплантатов и трансплантатов / Наличие коронарного ангиопластичного имплантата и трансплантата', 10),
        ('PSYCHIATRIC_DISORDERS', 'F00-F99 Психические расстройства и расстройства поведения', 11),
        ('DIABETES', 'E10-14 Сахарный диабет', 12),
        ('OBESITY', 'E65-68 Ожирение', 13),
        ('LIPID_DISORDERS', 'E78 Нарушения обмена липопротеидов и другие липидемии', 14),
    ]
    
    # Добавляем новые записи
    for code, value_ru, sort_order in new_comorbidities:
        cursor.execute("""
            INSERT INTO dictionaries (category, code, value_ru, is_active, sort_order, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ('comorbidities', code, value_ru, 1, sort_order, datetime.now()))
    
    # Обновляем sort_order для "Другое"
    cursor.execute("""
        UPDATE dictionaries 
        SET sort_order = 15 
        WHERE category = 'comorbidities' AND code = 'OTHER'
    """)
    
    # Сохраняем изменения
    conn.commit()
    
    # Проверяем результат
    cursor.execute("""
        SELECT id, category, code, value_ru, is_active, sort_order, created_at
        FROM dictionaries 
        WHERE category = 'comorbidities' 
        ORDER BY is_active DESC, sort_order
    """)
    
    print("Обновление завершено успешно!\n")
    print("Текущее содержимое справочника comorbidities:")
    print("-" * 150)
    for row in cursor.fetchall():
        print(f"ID: {row[0]}, Code: {row[2]}, Value: {row[3]}, Active: {row[4]}, Order: {row[5]}")
    
except Exception as e:
    conn.rollback()
    print(f"Ошибка: {e}")
finally:
    conn.close()