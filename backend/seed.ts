
#!/usr/bin/env python3
"""
Скрипт заполнения тестовыми данными
Создает 5 полностью заполненных пациентов для демонстрации
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from sqlalchemy.orm import sessionmaker
from database import engine
from models import Patient, ClinicalRecord, User, Institution
from datetime import datetime, timedelta
import random

def create_test_patients():
    """Create 5 fully filled test patients"""
    
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Get admin user and institution
        admin_user = db.query(User).filter_by(username="admin").first()
        if not admin_user:
            print("Admin user not found. Please initialize database first.")
            return
            
        institution = admin_user.institution
        
        # Test patients data
        test_patients = [
            {
                "patient_code": "PAT001",
                "gender": "м",
                "birth_date": datetime(1965, 3, 15),
                "height": 175.0,
                "weight": 78.5,
                "comorbidities": ["CV_HYPERTENSION", "DIABETES"],
                "smoking_status": "SMOKER_15",
                "initial_diagnosis_date": datetime(2022, 6, 10),
                "tnm_stage": "T2aN1M0",
                "metastatic_disease_date": datetime(2023, 1, 15),
                "histology": "ADENOCARCINOMA",
                "alk_diagnosis_date": datetime(2022, 6, 20),
                "alk_methods": ["IHC", "FISH"],
                "alk_fusion_variant": "V1",
                "tp53_comutation": "NO",
                "ttf1_expression": "YES",
                "had_previous_therapy": True,
                "no_previous_therapy": False,
                "previous_therapy_types": ["CHEMOTHERAPY"],
                "previous_therapy_start_date": datetime(2022, 7, 1),
                "previous_therapy_end_date": datetime(2022, 12, 30),
                "previous_therapy_response": "PD",
                "previous_therapy_stop_reason": "SWITCH_TO_TARGETED",
                "alectinib_start_date": datetime(2023, 2, 1),
                "stage_at_alectinib_start": "METASTATIC",
                "ecog_at_start": 1,
                "metastases_sites": ["LUNG", "BONES"],
                "cns_metastases": False,
                "maximum_response": "PR",
                "earliest_response_date": datetime(2023, 4, 15),
                "progression_during_alectinib": "NONE",
                "current_status": "ALIVE",
                "last_contact_date": datetime(2024, 10, 1)
            },
            {
                "patient_code": "PAT002", 
                "gender": "ж",
                "birth_date": datetime(1958, 8, 22),
                "height": 162.0,
                "weight": 65.3,
                "comorbidities": ["CV_ATHEROSCLEROSIS", "HYPERLIPIDEMIA"],
                "smoking_status": "NON_SMOKER_15",
                "initial_diagnosis_date": datetime(2021, 9, 5),
                "tnm_stage": "T3N2M0",
                "metastatic_disease_date": datetime(2022, 3, 10),
                "histology": "ADENOCARCINOMA",
                "alk_diagnosis_date": datetime(2021, 9, 18),
                "alk_methods": ["NGS", "IHC"],
                "alk_fusion_variant": "V2",
                "tp53_comutation": "YES",
                "ttf1_expression": "YES",
                "had_previous_therapy": True,
                "no_previous_therapy": False,
                "previous_therapy_types": ["CHEMOIMMUNOTHERAPY"],
                "previous_therapy_start_date": datetime(2021, 10, 15),
                "previous_therapy_end_date": datetime(2022, 2, 28),
                "previous_therapy_response": "SD",
                "previous_therapy_stop_reason": "PROGRESSION",
                "alectinib_start_date": datetime(2022, 3, 15),
                "stage_at_alectinib_start": "METASTATIC",
                "ecog_at_start": 2,
                "metastases_sites": ["LIVER", "CNS"],
                "cns_metastases": True,
                "cns_measurable": "MEASURABLE",
                "cns_symptomatic": "SYMPTOMATIC",
                "cns_radiotherapy": "DONE",
                "maximum_response": "CR",
                "earliest_response_date": datetime(2022, 6, 1),
                "intracranial_response": "PR",
                "progression_during_alectinib": "OLIGO",
                "local_treatment_at_progression": "RADIOTHERAPY",
                "progression_sites": ["BONES"],
                "progression_date": datetime(2024, 1, 10),
                "continued_after_progression": True,
                "current_status": "ALIVE",
                "last_contact_date": datetime(2024, 9, 15)
            },
            {
                "patient_code": "PAT003",
                "gender": "м", 
                "birth_date": datetime(1972, 12, 3),
                "height": 180.0,
                "weight": 85.2,
                "comorbidities": ["NONE"],
                "smoking_status": "SMOKER_15",
                "initial_diagnosis_date": datetime(2023, 4, 20),
                "tnm_stage": "T4N3M1a",
                "metastatic_disease_date": datetime(2023, 4, 20),
                "histology": "ADENOCARCINOMA", 
                "alk_diagnosis_date": datetime(2023, 5, 2),
                "alk_methods": ["FISH", "PCR"],
                "alk_fusion_variant": "V3",
                "tp53_comutation": "UNKNOWN",
                "ttf1_expression": "YES",
                "had_previous_therapy": False,
                "no_previous_therapy": True,
                "alectinib_start_date": datetime(2023, 5, 15),
                "stage_at_alectinib_start": "METASTATIC",
                "ecog_at_start": 0,
                "metastases_sites": ["LUNG", "PLEURA", "CNS"],
                "cns_metastases": True,
                "cns_measurable": "NON_MEASURABLE",
                "cns_symptomatic": "ASYMPTOMATIC", 
                "cns_radiotherapy": "NOT_DONE",
                "maximum_response": "SD",
                "earliest_response_date": datetime(2023, 8, 10),
                "intracranial_response": "SD",
                "progression_during_alectinib": "SYSTEMIC",
                "local_treatment_at_progression": "NONE",
                "progression_sites": ["LIVER", "BONES"],
                "progression_date": datetime(2024, 2, 15),
                "continued_after_progression": False,
                "alectinib_end_date": datetime(2024, 3, 1),
                "alectinib_stop_reason": "PROGRESSION",
                "had_treatment_interruption": True,
                "interruption_reason": "ADVERSE_EVENTS",
                "interruption_duration_months": 1.5,
                "had_dose_reduction": True,
                "next_line_treatments": ["LORLATINIB"],
                "next_line_start_date": datetime(2024, 3, 15),
                "progression_on_next_line": False,
                "next_line_end_date": None,
                "total_lines_after_alectinib": 1,
                "current_status": "ALIVE",
                "last_contact_date": datetime(2024, 10, 20)
            },
            {
                "patient_code": "PAT004",
                "gender": "ж",
                "birth_date": datetime(1945, 6, 18),
                "height": 158.0,
                "weight": 58.9,
                "comorbidities": ["CV_HEART_FAILURE", "CV_HYPERTENSION", "DIABETES"],
                "smoking_status": "NON_SMOKER_15",
                "initial_diagnosis_date": datetime(2020, 11, 8),
                "tnm_stage": "T1aN0M0",
                "metastatic_disease_date": datetime(2021, 8, 20),
                "histology": "ADENOCARCINOMA",
                "alk_diagnosis_date": datetime(2020, 11, 20),
                "alk_methods": ["IHC"],
                "alk_fusion_variant": "OTHER",
                "tp53_comutation": "NO",
                "ttf1_expression": "YES",
                "had_previous_therapy": True,
                "no_previous_therapy": False,
                "previous_therapy_types": ["CHEMOTHERAPY", "CHEMORADIOTHERAPY"],
                "previous_therapy_start_date": datetime(2020, 12, 1),
                "previous_therapy_end_date": datetime(2021, 5, 30),
                "previous_therapy_response": "CR",
                "previous_therapy_stop_reason": "COMPLETED",
                "alectinib_start_date": datetime(2021, 9, 1),
                "stage_at_alectinib_start": "METASTATIC",
                "ecog_at_start": 3,
                "metastases_sites": ["BONES", "LIVER"],
                "cns_metastases": False,
                "maximum_response": "PD",
                "earliest_response_date": datetime(2021, 12, 15),
                "progression_during_alectinib": "SYSTEMIC",
                "local_treatment_at_progression": "SURGERY",
                "progression_sites": ["CNS", "LUNG"],
                "progression_date": datetime(2022, 1, 10),
                "continued_after_progression": False,
                "alectinib_end_date": datetime(2022, 2, 1),
                "alectinib_stop_reason": "PROGRESSION",
                "had_treatment_interruption": False,
                "had_dose_reduction": False,
                "next_line_treatments": ["CRIZOTINIB", "CHEMOTHERAPY"],
                "next_line_start_date": datetime(2022, 2, 15),
                "progression_on_next_line": True,
                "progression_on_next_line_date": datetime(2022, 8, 20),
                "next_line_end_date": datetime(2022, 9, 1),
                "total_lines_after_alectinib": 2,
                "current_status": "DEAD",
                "last_contact_date": datetime(2022, 10, 15)
            },
            {
                "patient_code": "PAT005",
                "gender": "м",
                "birth_date": datetime(1968, 1, 25),
                "height": 172.0,
                "weight": 73.1,
                "comorbidities": ["PSYCHIATRIC", "OTHER"],
                "smoking_status": "SMOKER_15",
                "initial_diagnosis_date": datetime(2024, 1, 10),
                "tnm_stage": "T2bN1M0",
                "metastatic_disease_date": None,
                "histology": "SQUAMOUS_CELL",
                "alk_diagnosis_date": datetime(2024, 1, 20),
                "alk_methods": ["NGS"],
                "alk_fusion_variant": "UNKNOWN",
                "tp53_comutation": "UNKNOWN",
                "ttf1_expression": "NO",
                "had_previous_therapy": True,
                "no_previous_therapy": False,
                "previous_therapy_types": ["IMMUNOTHERAPY"],
                "previous_therapy_start_date": datetime(2024, 2, 1),
                "previous_therapy_end_date": datetime(2024, 5, 31),
                "previous_therapy_response": "PR",
                "previous_therapy_stop_reason": "SWITCH_TO_TARGETED",
                "alectinib_start_date": datetime(2024, 6, 15),
                "stage_at_alectinib_start": "LOCALLY_ADVANCED",
                "ecog_at_start": 1,
                "metastases_sites": ["NONE"],
                "cns_metastases": False,
                "maximum_response": "PR",
                "earliest_response_date": datetime(2024, 9, 1),
                "progression_during_alectinib": "NONE",
                "had_treatment_interruption": False,
                "had_dose_reduction": False,
                "current_status": "ALIVE",
                "last_contact_date": datetime(2024, 10, 25)
            }
        ]
        
        print("Creating test patients...")
        
        for i, patient_data in enumerate(test_patients, 1):
            # Check if patient with this code already exists
            existing_patient = db.query(ClinicalRecord).filter_by(
                patient_code=patient_data["patient_code"]
            ).first()
            
            if existing_patient:
                print(f"✓ Patient {patient_data['patient_code']} already exists, skipping")
                continue
            
            # Create patient
            patient = Patient(
                institution_id=institution.id,
                created_by=admin_user.id
            )
            db.add(patient)
            db.flush()
            
            # Calculate age at diagnosis
            birth_date = patient_data["birth_date"]
            diagnosis_date = patient_data["initial_diagnosis_date"]
            age_at_diagnosis = diagnosis_date.year - birth_date.year
            if (diagnosis_date.month, diagnosis_date.day) < (birth_date.month, birth_date.day):
                age_at_diagnosis -= 1
            
            # Create clinical record
            clinical_data = patient_data.copy()
            clinical_data["patient_id"] = patient.id
            clinical_data["age_at_diagnosis"] = age_at_diagnosis
            clinical_data["date_filled"] = datetime.utcnow()
            
            clinical_record = ClinicalRecord(**clinical_data)
            db.add(clinical_record)
            
            print(f"✓ Created test patient {i}: {patient_data['patient_code']}")
        
        db.commit()
        print(f"\n✓ Test data seeded successfully!")
        
    except Exception as e:
        print(f"\n✗ Error seeding test data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_test_patients()
