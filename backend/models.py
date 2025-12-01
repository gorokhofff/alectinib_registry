from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import bcrypt

Base = declarative_base()

class Institution(Base):
    __tablename__ = 'institutions'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(500), nullable=False, unique=True)
    code = Column(String(50), unique=True)
    city = Column(String(200))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    users = relationship("User", back_populates="institution")
    patients = relationship("Patient", back_populates="institution")

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    institution_id = Column(Integer, ForeignKey('institutions.id'), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    
    institution = relationship("Institution", back_populates="users")
    patients = relationship("Patient", back_populates="created_by_user")
    audit_logs = relationship("AuditLog", back_populates="user")
    
    def set_password(self, password: str):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password: str) -> bool:
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

class Patient(Base):
    __tablename__ = 'patients'
    
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey('institutions.id'), nullable=False)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    institution = relationship("Institution", back_populates="patients")
    created_by_user = relationship("User", back_populates="patients")
    clinical_record = relationship("ClinicalRecord", back_populates="patient", uselist=False)

class ClinicalRecord(Base):
    __tablename__ = 'clinical_records'
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False, unique=True)
    registry_type = Column(String(20), default="ALK", index=True) 
    
    # Основные
    patient_code = Column(String(100), index=True)
    date_filled = Column(DateTime, default=datetime.utcnow)
    
    # Базовые данные
    gender = Column(String(10))
    birth_date = Column(DateTime)
    height = Column(Float)
    weight = Column(Float)
    comorbidities = Column(JSON)
    smoking_status = Column(String(50))
    comorbidities_other_text = Column(Text)
    
    # Диагноз
    initial_diagnosis_date = Column(DateTime)
    tnm_stage = Column(String(50))
    metastatic_disease_date = Column(DateTime)
    histology = Column(String(100))
    
    # ALK
    alk_diagnosis_date = Column(DateTime)
    alk_methods = Column(JSON)
    alk_fusion_variant = Column(String(50))
    tp53_comutation = Column(String(20))
    ttf1_expression = Column(String(20))
    
    # Предыдущая терапия
    had_previous_therapy = Column(Boolean)
    no_previous_therapy = Column(Boolean, default=False)
    previous_therapy_types = Column(JSON)
    previous_therapy_start_date = Column(DateTime)
    previous_therapy_end_date = Column(DateTime)
    previous_therapy_response = Column(String(20))
    previous_therapy_stop_reason = Column(Text)
    
    # Алектиниб
    alectinib_start_date = Column(DateTime)
    stage_at_alectinib_start = Column(String(50))
    ecog_at_start = Column(Integer)
    metastases_sites = Column(JSON)
    metastases_sites_other_text = Column(Text)
    cns_metastases = Column(Boolean)
    cns_measurable = Column(String(50))
    cns_symptomatic = Column(String(50))
    cns_radiotherapy = Column(String(100))
    cns_radiotherapy_timing = Column(String(50))
    alectinib_therapy_status = Column(String(20))
    
    # Ответ
    maximum_response = Column(String(20))
    earliest_response_date = Column(DateTime)
    intracranial_response = Column(String(20))
    
    # Прогрессирование (во время терапии)
    progression_during_alectinib = Column(String(50))
    local_treatment_at_progression = Column(String(100))
    progression_sites = Column(JSON)
    progression_sites_other_text = Column(Text)
    progression_date = Column(DateTime)
    continued_after_progression = Column(Boolean)
    
    # Завершение
    alectinib_end_date = Column(DateTime)
    alectinib_stop_reason = Column(Text)
    had_treatment_interruption = Column(Boolean)
    interruption_reason = Column(Text)
    interruption_duration_months = Column(Float)
    had_dose_reduction = Column(Boolean)
    
    # --- НОВЫЕ ПОЛЯ: Прогрессирование ПОСЛЕ отмены ---
    after_alectinib_progression_type = Column(String(50))
    after_alectinib_progression_sites = Column(JSON)
    after_alectinib_progression_sites_other_text = Column(Text)
    after_alectinib_progression_date = Column(DateTime)
    
    # Следующая линия
    next_line_treatments = Column(JSON)
    next_line_start_date = Column(DateTime)
    progression_on_next_line = Column(Boolean)
    progression_on_next_line_date = Column(DateTime)
    next_line_progression_type = Column(String(50))
    next_line_progression_sites = Column(JSON)
    next_line_progression_sites_other_text = Column(Text)
    next_line_treatments_other_text = Column(Text)
    next_line_end_date = Column(DateTime)
    total_lines_after_alectinib = Column(Integer)
    
    # ROS1
    ros1_fusion_variant = Column(String(50))
    pdl1_status = Column(String(20))
    pdl1_tps = Column(Float)
    radical_treatment_conducted = Column(Boolean)
    radical_surgery_conducted = Column(Boolean)
    radical_surgery_date = Column(DateTime)
    radical_surgery_type = Column(String(100))
    radical_surgery_type_other = Column(Text)
    radical_crt_conducted = Column(Boolean)
    radical_crt_start_date = Column(DateTime)
    radical_crt_end_date = Column(DateTime)
    radical_crt_consolidation = Column(Boolean)
    radical_crt_consolidation_drug = Column(String(100))
    radical_crt_consolidation_end_date = Column(DateTime)
    radical_perioperative_therapy = Column(JSON)
    radical_treatment_outcome = Column(String(50))
    relapse_date = Column(DateTime)
    metastatic_diagnosis_date = Column(DateTime)
    metastatic_therapy_lines = Column(JSON)

    # Статус
    current_status = Column(String(50))
    last_contact_date = Column(DateTime)
    age_at_diagnosis = Column(Integer)
    
    patient = relationship("Patient", back_populates="clinical_record")

class Dictionary(Base):
    __tablename__ = 'dictionaries'
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100), nullable=False, index=True)
    code = Column(String(100), nullable=False)
    value_ru = Column(String(500), nullable=False)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    parent = Column(String(100))

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    action = Column(String(100), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    record_type = Column(String(50))
    record_id = Column(Integer)
    details = Column(JSON)
    user = relationship("User", back_populates="audit_logs")