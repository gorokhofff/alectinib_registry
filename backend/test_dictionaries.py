#!/usr/bin/env python3
"""
Скрипт для тестирования справочников
Проверяет загрузку всех справочников из базы данных
"""

from sqlalchemy.orm import sessionmaker
from models import Dictionary
from database import engine
from collections import defaultdict

def test_dictionaries():
    """Тестирование загрузки справочников"""
    
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("ПРОВЕРКА СПРАВОЧНИКОВ БАЗЫ ДАННЫХ")
        print("=" * 80)
        
        # Получение всех справочников
        all_dicts = db.query(Dictionary).all()
        
        if not all_dicts:
            print("\n⚠ ПРЕДУПРЕЖДЕНИЕ: Справочники не найдены в базе данных!")
            print("Запустите скрипт init_db.py для заполнения справочников.")
            return
        
        # Группировка по категориям
        categories = defaultdict(list)
        for d in all_dicts:
            categories[d.category].append(d)
        
        # Список ожидаемых категорий
        expected_alk_categories = [
            "comorbidities",
            "alk_methods",
            "alk_fusion_variant",
            "previous_therapy_types",
            "metastases_sites",
            "histology",
            "stage_at_alectinib_start",
            "alectinib_therapy_status",
            "response",
            "progression_type",
            "local_treatment_at_progression",
            "alectinib_stop_reason",
            "interruption_reason",
            "next_line_treatments",
            "current_status",
            "yes_no_unknown",
            "cns_measurable",
            "cns_symptomatic",
            "cns_radiotherapy",
            "previous_therapy_stop_reason",
            "smoking_status",
            "tnm_stage"
        ]
        
        expected_ros1_categories = [
            "ros1_fusion_variant",
            "pdl1_status",
            "therapy_classes",
            "treatment_regimens",
            "chemo_drugs"
        ]
        
        print("\n" + "=" * 80)
        print("СПРАВОЧНИКИ ALK РЕГИСТРА")
        print("=" * 80)
        
        alk_total = 0
        for cat in expected_alk_categories:
            if cat in categories:
                count = len(categories[cat])
                alk_total += count
                print(f"✓ {cat:40s} : {count:3d} записей")
            else:
                print(f"✗ {cat:40s} : ОТСУТСТВУЕТ")
        
        print("\n" + "=" * 80)
        print("СПРАВОЧНИКИ ROS1 РЕГИСТРА (НОВЫЕ)")
        print("=" * 80)
        
        ros1_total = 0
        for cat in expected_ros1_categories:
            if cat in categories:
                count = len(categories[cat])
                ros1_total += count
                
                # Вывод записей с parent для treatment_regimens
                if cat == "treatment_regimens":
                    print(f"\n✓ {cat:40s} : {count:3d} записей")
                    for item in sorted(categories[cat], key=lambda x: x.sort_order):
                        parent_info = f" (parent: {item.parent})" if item.parent else ""
                        print(f"   - {item.code:25s} : {item.value_ru}{parent_info}")
                else:
                    print(f"✓ {cat:40s} : {count:3d} записей")
            else:
                print(f"✗ {cat:40s} : ОТСУТСТВУЕТ")
        
        # Проверка на лишние категории
        all_expected = set(expected_alk_categories + expected_ros1_categories)
        extra_categories = set(categories.keys()) - all_expected
        
        if extra_categories:
            print("\n" + "=" * 80)
            print("ДОПОЛНИТЕЛЬНЫЕ КАТЕГОРИИ (не указаны в ожидаемых)")
            print("=" * 80)
            for cat in sorted(extra_categories):
                count = len(categories[cat])
                print(f"• {cat:40s} : {count:3d} записей")
        
        # Итоговая статистика
        print("\n" + "=" * 80)
        print("ИТОГОВАЯ СТАТИСТИКА")
        print("=" * 80)
        print(f"ALK справочники:  {len([c for c in expected_alk_categories if c in categories])}/{len(expected_alk_categories)} категорий, {alk_total} записей")
        print(f"ROS1 справочники: {len([c for c in expected_ros1_categories if c in categories])}/{len(expected_ros1_categories)} категорий, {ros1_total} записей")
        print(f"Всего категорий:  {len(categories)}")
        print(f"Всего записей:    {len(all_dicts)}")
        
        # Проверка на успешность
        missing_alk = [c for c in expected_alk_categories if c not in categories]
        missing_ros1 = [c for c in expected_ros1_categories if c not in categories]
        
        if missing_alk or missing_ros1:
            print("\n⚠ ВНИМАНИЕ: Некоторые категории отсутствуют!")
            if missing_alk:
                print(f"   Отсутствуют ALK категории: {', '.join(missing_alk)}")
            if missing_ros1:
                print(f"   Отсутствуют ROS1 категории: {', '.join(missing_ros1)}")
            print("\nЗапустите скрипт init_db.py для добавления недостающих справочников.")
        else:
            print("\n✓ ВСЕ ОЖИДАЕМЫЕ СПРАВОЧНИКИ ЗАГРУЖЕНЫ УСПЕШНО!")
        
        print("=" * 80)
        
    except Exception as e:
        print(f"\n✗ Ошибка при проверке справочников: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_dictionaries()
