#!/usr/bin/env python3
"""
Скрипт инициализации базы данных
Создает таблицы, первого администратора и заполняет справочники
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User, Institution, Dictionary
from database import engine
import sys
from datetime import datetime

def init_database():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created successfully")
    
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Создание учреждения
        institution = db.query(Institution).filter_by(name="НМИЦ Онкологии им. Н.Н. Блохина").first()
        if not institution:
            institution = Institution(name="НМИЦ Онкологии им. Н.Н. Блохина", code="BLOKHIN", city="Москва")
            db.add(institution)
            db.commit()
            db.refresh(institution)
        
        # Создание админа
        admin = db.query(User).filter_by(username="admin").first()
        if not admin:
            admin = User(username="admin", role="admin", institution_id=institution.id)
            admin.set_password("Dlyazapolneniya8!")
            db.add(admin)
            db.commit()
        
        print("\nPopulating dictionaries...")
        
        dictionaries = [
            # --- НОВЫЕ СПРАВОЧНИКИ ДЛЯ ROS1 ---
            {
                "category": "ros1_fusion_variant",
                "items": [
                    ("CD74", "CD74", 1),
                    ("EZR", "EZR", 2),
                    ("SLC34A2", "SLC34A2", 3),
                    ("SDC4", "SDC4", 4),
                    ("FIG", "FIG", 5),
                    ("TPM3", "TPM3", 6),
                    ("LRIG3", "LRIG3", 7),
                    ("KDELR2", "KDELR2", 8),
                    ("CCDC6", "CCDC6", 9),
                    ("TMEM106B", "TMEM106B", 10),
                    ("TFG", "TFG", 11),
                    ("OTHER", "Другой", 12),
                    ("UNKNOWN", "Неизвестно", 13),
                ]
            },
            {
                "category": "pdl1_status",
                "items": [
                    ("TPS_LESS_1", "TPS < 1%", 1),
                    ("TPS_1_49", "TPS 1-49%", 2),
                    ("TPS_MORE_50", "TPS ≥ 50%", 3),
                    ("NOT_DONE", "Не выполнялся", 4),
                    ("UNKNOWN", "Неизвестно", 5),
                ]
            },
            {
                "category": "surgery_types",
                "items": [
                    ("LOBECTOMY_LN", "Лобэктомия + лимфодиссекция", 1),
                    ("LOBECTOMY_NO_LN", "Лобэктомия без лимфодиссекции", 2),
                    ("PNEUMONECTOMY_LN", "Пневмонэктомия + лимфодиссекция", 3),
                    ("PNEUMONECTOMY_NO_LN", "Пневмонэктомия без лимфодиссекции", 4),
                    ("ATYPICAL_RESECTION", "Атипичная резекция", 5),
                    ("OTHER", "Другое", 6),
                ]
            },
            # --- ИСХОДЫ РАДИКАЛЬНОГО ЛЕЧЕНИЯ ---
            {
                "category": "radical_treatment_outcome",
                "items": [
                    ("REMISSION", "Ремиссия (без признаков болезни)", 1),
                    ("RELAPSE", "Рецидив", 2),
                    ("DEATH", "Смерть", 3),
                    ("UNKNOWN", "Неизвестно", 4),
                ]
            },
            # --- ЛОКАЛЬНОЕ ЛЕЧЕНИЕ ---
            {
                "category": "local_treatment_at_progression",
                "items": [
                    ("RADIOTHERAPY", "Радиотерапия", 1),
                    ("SURGERY", "Хирургия", 2),
                    ("NONE", "Локальное лечение не проводилось", 3),
                ]
            },
            
            # --- СУЩЕСТВУЮЩИЕ СПРАВОЧНИКИ ---
            {
                "category": "comorbidities",
                "items": [
                    ("CV_ATHEROSCLEROSIS", "Атеросклероз коронарных, сонных артерий", 1),
                    ("CV_HEART_FAILURE", "Хроническая сердечная недостаточность", 2),
                    ("CV_ANGINA", "Стенокардия", 3),
                    ("CV_BYPASS", "Хирургическое шунтирование", 4),
                    ("CV_STENTING", "Стентирование", 5),
                    ("CV_HYPERTENSION", "Артериальная гипертензия", 6),
                    ("THROMBOSIS_EMBOLISM", "Случаи тромбоза и эмболии вен и артерий", 7),
                    ("MYOCARDIAL_INFARCTION", "Инфаркт миокарда и ишемия", 8),
                    ("CEREBROVASCULAR", "Цереброваскулярные нарушения", 9),
                    ("HYPERLIPIDEMIA", "Гиперлипидемия, гиперхолестеринемия", 10),
                    ("DIABETES", "Сахарный диабет или нарушение толерантности к глюкозе", 11),
                    ("PSYCHIATRIC", "Психиатрические нарушения", 12),
                    ("OTHER", "Другое", 13),
                    ("NONE", "Нет", 14),
                ]
            },
            {
                "category": "therapy_classes",
                "items": [
                    ("TARGETED", "Таргетная терапия", 1),
                    ("IMMUNOTHERAPY", "Иммунотерапия", 2),
                    ("CHEMOTHERAPY", "Химиотерапия", 3),
                    ("CHEMOIMMUNOTHERAPY", "Химиоиммунотерапия", 4),
                    ("CHEMOTARGETED", "Химиотаргетная терапия", 5),
                ]
            },
            {
                "category": "treatment_regimens",
                "items": [
                    ("MONOTHERAPY", "Монотерапия", 1, "ALL"),
                    ("PLATINUM_DOUBLET", "Платиновый дублет", 2, "CHEMOTHERAPY"),
                    ("NON_PLATINUM_DOUBLET", "Неплатиновый дублет", 3, "CHEMOTHERAPY"),
                    ("OTHER_REGIMEN", "Другая схема", 4, "ALL"),
                ]
            },
            {
                "category": "chemo_drugs",
                "items": [
                    ("CISPLATIN", "Цисплатин", 1, "CHEMOTHERAPY"),
                    ("CARBOPLATIN", "Карбоплатин", 2, "CHEMOTHERAPY"),
                    ("PEMETREXED", "Пеметрексед", 3, "CHEMOTHERAPY"),
                    ("PACLITAXEL", "Паклитаксел", 4, "CHEMOTHERAPY"),
                    ("DOCETAXEL", "Доцетаксел", 5, "CHEMOTHERAPY"),
                    ("GEMCITABINE", "Гемцитабин", 6, "CHEMOTHERAPY"),
                    ("VINORELBINE", "Винорелбин", 7, "CHEMOTHERAPY"),
                    ("ETOPOSIDE", "Этопозид", 8, "CHEMOTHERAPY"),
                    ("PEMBROLIZUMAB", "Пембролизумаб", 9, "IMMUNOTHERAPY"),
                    ("NIVOLUMAB", "Ниволумаб", 10, "IMMUNOTHERAPY"),
                    ("ATEZOLIZUMAB", "Атезолизумаб", 11, "IMMUNOTHERAPY"),
                    ("DURVALUMAB", "Дурвалумаб", 12, "IMMUNOTHERAPY"),
                    ("IPILIMUMAB", "Ипилимумаб", 13, "IMMUNOTHERAPY"),
                    ("ALECTINIB", "Алектиниб", 14, "TARGETED"),
                    ("CRIZOTINIB", "Кризотиниб", 15, "TARGETED"),
                    ("CERITINIB", "Церитиниб", 16, "TARGETED"),
                    ("BRIGATINIB", "Бригатиниб", 17, "TARGETED"),
                    ("LORLATINIB", "Лорлатиниб", 18, "TARGETED"),
                    ("BEVACIZUMAB", "Бевацизумаб", 19, "TARGETED"),
                    ("RAMUCIRUMAB", "Рамуцирумаб", 20, "TARGETED"),
                    ("ENTRECTINIB", "Энтректиниб", 21, "TARGETED"),
                    ("REPOTRECTINIB", "Репотректиниб", 22, "TARGETED"),
                ]
            },
            {
                "category": "alk_methods",
                "items": [
                    ("IHC", "ИГХ (иммуногистохимия)", 1),
                    ("FISH", "FISH (флуоресцентная гибридизация)", 2),
                    ("PCR", "ПЦР (полимеразная цепная реакция)", 3),
                    ("NGS", "NGS (секвенирование нового поколения)", 4),
                ]
            },
            {
                "category": "alk_fusion_variant",
                "items": [
                    ("V1", "Вариант 1", 1),
                    ("V2", "Вариант 2", 2),
                    ("V3", "Вариант 3", 3),
                    ("OTHER", "Другой", 4),
                    ("UNKNOWN", "Неизвестно", 5),
                ]
            },
            {
                "category": "previous_therapy_types",
                "items": [
                    ("CHEMOTHERAPY", "Химиотерапия", 1),
                    ("IMMUNOTHERAPY", "Иммунотерапия", 2),
                    ("CHEMOIMMUNOTHERAPY", "Химиоиммунотерапия", 3),
                    ("CHEMORADIOTHERAPY", "Химиолучевая терапия", 4),
                    ("OTHER", "Другое", 5),
                ]
            },
            {
                "category": "metastases_sites",
                "items": [
                    ("BONES", "Кости", 1),
                    ("LIVER", "Печень", 2),
                    ("LUNG", "Легкое", 3),
                    ("PLEURA", "Плевра", 4),
                    ("CNS", "ЦНС", 5),
                    ("OTHER", "Другое", 6),
                    # "NONE" Removed
                ]
            },
            {
                "category": "histology",
                "items": [
                    ("ADENOCARCINOMA", "Аденокарцинома", 1),
                    ("SQUAMOUS_CELL", "Плоскоклеточный рак", 2),
                    ("DIMORPHIC", "Диморфный", 3),
                    ("OTHER", "Другое", 4),
                ]
            },
            {
                "category": "stage_at_alectinib_start",
                "items": [
                    ("LOCALLY_ADVANCED", "Местнораспространенная", 1),
                    ("METASTATIC", "Метастатическая", 2),
                ]
            },
            {
                "category": "alectinib_therapy_status",
                "items": [
                    ("ONGOING", "Продолжается", 1),
                    ("STOPPED", "Прекращена", 2),
                ]
            },
            {
                "category": "response",
                "items": [
                    ("CR", "ПО (полный ответ)", 1),
                    ("PR", "ЧО (частичный ответ)", 2),
                    ("SD", "СЗ (стабилизация)", 3),
                    ("PD", "ПЗ (прогрессирование)", 4),
                    # "NA" removed or renamed, usually "Unknown" is removed
                ]
            },
            {
                "category": "progression_type",
                "items": [
                    ("OLIGO", "Олигопрогрессирование", 1),
                    ("SYSTEMIC", "Системное прогрессирование", 2),
                    ("NONE", "Нет", 3),
                ]
            },
            {
                "category": "local_treatment_at_progression",
                "items": [
                    ("RADIOTHERAPY", "Радиотерапия", 1),
                    ("SURGERY", "Хирургия", 2),
                    ("NONE", "Локальное лечение не проводилось", 3),
                ]
            },
            {
                "category": "alectinib_stop_reason",
                "items": [
                    ("INTOLERANCE", "Непереносимость", 2),
                    ("PATIENT_REFUSAL", "Отказ пациента", 3),
                    ("ADMINISTRATIVE", "Административные причины", 4),
                    ("LOSS_OF_BENEFIT", "Утрата клинической пользы", 5),
                    ("OTHER", "Другое", 6),
                ]
            },
            {
                "category": "interruption_reason",
                "items": [
                    ("ADVERSE_EVENTS", "Нежелательные явления", 1),
                    ("NON_COMPLIANCE", "Несоблюдение пациентом предписаний", 2),
                    ("ADMINISTRATIVE", "Административные причины", 3),
                    ("OTHER", "Другое", 4),
                ]
            },
            {
                "category": "next_line_treatments",
                "items": [
                    ("CRIZOTINIB", "Кризотиниб", 1),
                    ("CERITINIB", "Церитиниб", 2),
                    ("LORLATINIB", "Лорлатиниб", 3),
                    ("OTHER_ALK_TKI", "Другие ALK ИТК", 4),
                    ("CHEMOTHERAPY", "Химиотерапия", 5),
                    ("IMMUNOTHERAPY", "Мономмунотерапия", 6),
                    ("CHEMOIMMUNOTHERAPY", "Химиоиммунотерапия", 7),
                    ("CHEMOIMMUNOTARGETED", "Химиоиммунотаргетная терапия", 8),
                    ("OTHER", "Другое", 9),
                ]
            },
            {
                "category": "current_status",
                "items": [
                    ("ALIVE", "Жив", 1),
                    ("DEAD", "Умер", 2),
                    ("LOST_TO_FOLLOWUP", "Ушел из-под наблюдения", 3),
                ]
            },
            {
                "category": "yes_no_unknown",
                "items": [
                    ("YES", "Да", 1),
                    ("NO", "Нет", 2),
                    ("UNKNOWN", "Неизвестно", 3),
                ]
            },
            {
                "category": "cns_measurable",
                "items": [
                    ("MEASURABLE", "Измеряемые", 1),
                    ("NON_MEASURABLE", "Неизмеряемые", 2),
                ]
            },
            {
                "category": "cns_symptomatic",
                "items": [
                    ("SYMPTOMATIC", "Симптоматические", 1),
                    ("ASYMPTOMATIC", "Бессимптомные", 2),
                ]
            },
            {
                "category": "cns_radiotherapy",
                "items": [
                    # "DONE" renamed or logic changed in frontend, keeping basic here
                    ("DONE", "Радиотерапия метастазов в ЦНС проводилась", 1),
                    ("NOT_DONE", "Радиотерапия не проводилась", 2),
                ]
            },
            {
                "category": "previous_therapy_stop_reason",
                "items": [
                    ("SWITCH_TO_TARGETED", "Переход на таргетную терапию", 1),
                    ("PROGRESSION", "Прогрессирование", 2),
                    ("INTOLERANCE", "Непереносимость", 3),
                    ("COMPLETED", "Завершена по плану", 4),
                    ("PATIENT_REFUSAL", "Отказ пациента", 5), # NEW
                    ("OTHER", "Другое", 6),
                ]
            },
            {
                "category": "smoking_status",
                "items": [
                    ("SMOKER_15", "курил 15 пачка/лет", 1),
                    ("NON_SMOKER_15", "не курил 15 пачка/лет", 2),
                ]
            },
            {
                "category": "tnm_stage",
                "items": [
                    ("T1aN0M0", "T1aN0M0", 1),
                    ("T1bN0M0", "T1bN0M0", 2),
                    ("T1cN0M0", "T1cN0M0", 3),
                    ("T2aN0M0", "T2aN0M0", 4),
                    ("T2bN0M0", "T2bN0M0", 5),
                    ("T3N0M0", "T3N0M0", 6),
                    ("T4N0M0", "T4N0M0", 7),
                    ("T1aN1M0", "T1aN1M0", 8),
                    ("T1bN1M0", "T1bN1M0", 9),
                    ("T1cN1M0", "T1cN1M0", 10),
                    ("T2aN1M0", "T2aN1M0", 11),
                    ("T2bN1M0", "T2bN1M0", 12),
                    ("T3N1M0", "T3N1M0", 13),
                    ("T4N1M0", "T4N1M0", 14),
                    ("T1aN2M0", "T1aN2M0", 15),
                    ("T1bN2M0", "T1bN2M0", 16),
                    ("T1cN2M0", "T1cN2M0", 17),
                    ("T2aN2M0", "T2aN2M0", 18),
                    ("T2bN2M0", "T2bN2M0", 19),
                    ("T3N2M0", "T3N2M0", 20),
                    ("T4N2M0", "T4N2M0", 21),
                    ("T1aN3M0", "T1aN3M0", 22),
                    ("T1bN3M0", "T1bN3M0", 23),
                    ("T1cN3M0", "T1cN3M0", 24),
                    ("T2aN3M0", "T2aN3M0", 25),
                    ("T2bN3M0", "T2bN3M0", 26),
                    ("T3N3M0", "T3N3M0", 27),
                    ("T4N3M0", "T4N3M0", 28),
                    ("T0N0M1a", "T0N0M1a", 29),
                    ("T0N1M1a", "T0N1M1a", 30),
                    ("T0N2M1a", "T0N2M1a", 31),
                    ("T0N3M1a", "T0N3M1a", 32),
                    ("T1aN0M1a", "T1aN0M1a", 33),
                    ("T1bN0M1a", "T1bN0M1a", 34),
                    ("T1cN0M1a", "T1cN0M1a", 35),
                    ("T2aN0M1a", "T2aN0M1a", 36),
                    ("T2bN0M1a", "T2bN0M1a", 37),
                    ("T3N0M1a", "T3N0M1a", 38),
                    ("T4N0M1a", "T4N0M1a", 39),
                    ("T1aN1M1a", "T1aN1M1a", 40),
                    ("T1bN1M1a", "T1bN1M1a", 41),
                    ("T1cN1M1a", "T1cN1M1a", 42),
                    ("T2aN1M1a", "T2aN1M1a", 43),
                    ("T2bN1M1a", "T2bN1M1a", 44),
                    ("T3N1M1a", "T3N1M1a", 45),
                    ("T4N1M1a", "T4N1M1a", 46),
                    ("T1aN2M1a", "T1aN2M1a", 47),
                    ("T1bN2M1a", "T1bN2M1a", 48),
                    ("T1cN2M1a", "T1cN2M1a", 49),
                    ("T2aN2M1a", "T2aN2M1a", 50),
                    ("T2bN2M1a", "T2bN2M1a", 51),
                    ("T3N2M1a", "T3N2M1a", 52),
                    ("T4N2M1a", "T4N2M1a", 53),
                    ("T1aN3M1a", "T1aN3M1a", 54),
                    ("T1bN3M1a", "T1bN3M1a", 55),
                    ("T1cN3M1a", "T1cN3M1a", 56),
                    ("T2aN3M1a", "T2aN3M1a", 57),
                    ("T2bN3M1a", "T2bN3M1a", 58),
                    ("T3N3M1a", "T3N3M1a", 59),
                    ("T4N3M1a", "T4N3M1a", 60),
                    ("AnyTAnyNM1b", "AnyTAnyNM1b", 61),
                    ("AnyTAnyNM1c", "AnyTAnyNM1c", 62),
                ]
            },
            {
                "category": "progression_sites",
                "items": [
                    ('CNS', 'ЦНС', 1),
                    ('BONES', 'Кости', 2),
                    ('LIVER', 'Печень', 3),
                    ('LUNG', 'Легкое', 4),
                    ('PLEURA', 'Плевра', 5),
                    ('LYMPH_NODE', 'Лимфоузлы средостения', 6),
                    ('ADRENAL', 'Надпочечник', 7),
                    ('OTHER', 'Другое', 8),
                ]
            },
            {
                "category": "alectinib_progression_type",
                "items": [
                    ('OLIGO', 'Олигопрогрессирование', 1),
                    ('SYSTEMIC', 'Системное', 2),
                    ('NONE', 'Нет', 3),
                ]
            },
        ]
        
        total_inserted = 0
        for dict_cat in dictionaries:
            category = dict_cat["category"]
            for item in dict_cat["items"]:
                if len(item) == 4:
                    code, value_ru, sort_order, parent = item
                else:
                    code, value_ru, sort_order = item
                    parent = None

                existing = db.query(Dictionary).filter_by(category=category, code=code).first()
                
                if not existing:
                    dict_entry = Dictionary(
                        category=category, code=code, value_ru=value_ru,
                        sort_order=sort_order, parent=parent
                    )
                    db.add(dict_entry)
                    total_inserted += 1
                else:
                    # Update if exists
                    existing.value_ru = value_ru
                    existing.sort_order = sort_order
                    if parent is not None:
                        existing.parent = parent
        
        db.commit()
        print(f"✓ Dictionaries populated: {total_inserted} entries added")
        
    except Exception as e:
        print(f"\n✗ Error during initialization: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    init_database()