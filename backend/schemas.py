from pydantic import BaseModel, Field, validator, field_validator, model_validator
from datetime import datetime
from typing import Optional, List, Any
from enum import Enum

class Gender(str, Enum):
    MALE = "м"
    FEMALE = "ж"

class Role(str, Enum):
    ADMIN = "admin"
    USER = "user"

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    institution_id: int
    institution_name: str
    is_active: bool
    last_login: Optional[datetime] = None
    class Config: from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class InstitutionBase(BaseModel):
    name: str
    code: Optional[str] = None
    city: Optional[str] = None
class InstitutionCreate(InstitutionBase): pass
class InstitutionResponse(InstitutionBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config: from_attributes = True

class UserCreate(BaseModel):
    username: str
    password: str
    role: Role
    institution_id: int
class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[Role] = None
    institution_id: Optional[int] = None
    is_active: Optional[bool] = None

class ClinicalRecordBase(BaseModel):
    registry_type: Optional[str] = "ALK"
    patient_code: Optional[str] = None
    date_filled: Optional[datetime] = None
    
    gender: Optional[str] = None
    birth_date: Optional[datetime] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    comorbidities: Optional[List[str]] = None
    smoking_status: Optional[str] = None
    comorbidities_other_text: Optional[str] = None
    
    initial_diagnosis_date: Optional[datetime] = None
    tnm_stage: Optional[str] = None
    metastatic_disease_date: Optional[datetime] = None
    histology: Optional[str] = None
    histology_other: Optional[str] = None
    
    alk_diagnosis_date: Optional[datetime] = None
    alk_methods: Optional[List[str]] = None
    alk_fusion_variant: Optional[str] = None
    tp53_comutation: Optional[str] = None
    ttf1_expression: Optional[str] = None
    
    had_previous_therapy: Optional[bool] = None
    no_previous_therapy: Optional[bool] = None
    previous_therapy_types: Optional[List[str]] = None
    previous_therapy_types_other: Optional[str] = None
    previous_therapy_start_date: Optional[datetime] = None
    previous_therapy_end_date: Optional[datetime] = None
    previous_therapy_response: Optional[str] = None
    previous_therapy_stop_reason: Optional[str] = None
    previous_therapy_stop_reason_other: Optional[str] = None
    
    alectinib_start_date: Optional[datetime] = None
    stage_at_alectinib_start: Optional[str] = None
    ecog_at_start: Optional[int] = None
    metastases_sites: Optional[List[str]] = None
    metastases_sites_other_text: Optional[str] = None
    cns_metastases: Optional[bool] = None
    cns_measurable: Optional[str] = None
    cns_symptomatic: Optional[str] = None
    cns_radiotherapy: Optional[str] = None
    alectinib_therapy_status: Optional[str] = None
    
    maximum_response: Optional[str] = None
    earliest_response_date: Optional[datetime] = None
    intracranial_response: Optional[str] = None
    
    progression_during_alectinib: Optional[str] = None
    local_treatment_at_progression: Optional[str] = None
    progression_sites: Optional[List[str]] = None
    progression_sites_other_text: Optional[str] = None
    progression_date: Optional[datetime] = None
    continued_after_progression: Optional[bool] = None
    
    alectinib_end_date: Optional[datetime] = None
    alectinib_stop_reason: Optional[str] = None
    alectinib_stop_reason_other: Optional[str] = None # NEW
    had_treatment_interruption: Optional[bool] = None
    interruption_reason: Optional[str] = None
    interruption_duration_months: Optional[float] = None
    had_dose_reduction: Optional[bool] = None
    
    # --- НОВЫЕ ПОЛЯ (AFTER ALECTINIB) ---
    after_alectinib_progression_type: Optional[str] = None
    after_alectinib_progression_sites: Optional[List[str]] = None
    after_alectinib_progression_sites_other_text: Optional[str] = None
    after_alectinib_progression_date: Optional[datetime] = None
    
    next_line_treatments: Optional[List[str]] = None
    next_line_start_date: Optional[datetime] = None
    progression_on_next_line: Optional[bool] = None
    progression_on_next_line_date: Optional[datetime] = None
    next_line_progression_type: Optional[str] = None
    next_line_progression_sites: Optional[List[str]] = None
    next_line_progression_sites_other_text: Optional[str] = None
    next_line_treatments_other_text: Optional[str] = None
    next_line_end_date: Optional[datetime] = None
    total_lines_after_alectinib: Optional[int] = None
    
    # ROS1
    ros1_fusion_variant: Optional[str] = None
    pdl1_status: Optional[str] = None
    pdl1_tps: Optional[float] = None
    radical_treatment_conducted: Optional[bool] = None
    radical_surgery_conducted: Optional[bool] = None
    radical_surgery_date: Optional[datetime] = None
    radical_surgery_type: Optional[str] = None
    radical_surgery_type_other: Optional[str] = None
    radical_crt_conducted: Optional[bool] = None
    radical_crt_start_date: Optional[datetime] = None
    radical_crt_end_date: Optional[datetime] = None
    radical_crt_consolidation: Optional[bool] = None
    radical_crt_consolidation_drug: Optional[str] = None
    radical_crt_consolidation_end_date: Optional[datetime] = None
    radical_perioperative_therapy: Optional[Any] = None
    radical_treatment_outcome: Optional[str] = None
    relapse_date: Optional[datetime] = None
    metastatic_diagnosis_date: Optional[datetime] = None
    metastatic_therapy_lines: Optional[Any] = None

    current_status: Optional[str] = None
    last_contact_date: Optional[datetime] = None

    @field_validator(
        'birth_date', 'initial_diagnosis_date', 'metastatic_disease_date', 
        'alk_diagnosis_date', 'previous_therapy_start_date', 'previous_therapy_end_date',
        'alectinib_start_date', 'earliest_response_date', 'progression_date',
        'alectinib_end_date', 'next_line_start_date', 'progression_on_next_line_date',
        'next_line_end_date', 'last_contact_date', 'date_filled', 
        'after_alectinib_progression_date', 'radical_surgery_date', 
        'radical_crt_start_date', 'radical_crt_end_date', 
        'radical_crt_consolidation_end_date', 'relapse_date', 
        'metastatic_diagnosis_date',
        mode='before'
    )
    def empty_string_to_none_date(cls, v):
        if v == "": return None
        return v

    @field_validator('height', 'weight', 'ecog_at_start', 'interruption_duration_months', 'total_lines_after_alectinib', 'pdl1_tps', mode='before')
    def empty_string_to_none_float(cls, v):
        if v == "": return None
        return v

    @field_validator('height')
    def validate_height(cls, v):
        if v is not None:
            if v < 30 or v > 250:
                raise ValueError('Рост должен быть в диапазоне от 30 до 250 см')
        return v

    @field_validator('weight')
    def validate_weight(cls, v):
        if v is not None:
            if v < 10 or v > 300:
                raise ValueError('Вес должен быть в диапазоне от 10 до 300 кг')
        return v

    @model_validator(mode='after')
    def validate_dates_sequence(self):
        def check_order(date_early, date_late, error_msg):
            if date_early and date_late and date_early > date_late:
                raise ValueError(error_msg)

        def parse_date(d):
            if not d: return None
            if isinstance(d, datetime): return d
            if isinstance(d, str):
                try:
                    return datetime.fromisoformat(d.replace('Z', ''))
                except:
                    try:
                        return datetime.strptime(d, "%Y-%m-%d")
                    except:
                        return None
            return None

        # Общие проверки
        check_order(self.birth_date, self.initial_diagnosis_date, 'Дата рождения не может быть позже даты диагноза')
        
        if self.current_status == 'DEAD':
            check_order(self.initial_diagnosis_date, self.last_contact_date, 'Дата смерти не может быть раньше даты диагноза')

        # --- ALK ---
        if self.registry_type == 'ALK':
            check_order(self.initial_diagnosis_date, self.alk_diagnosis_date, 'Дата ALK диагностики не может быть раньше даты основного диагноза')
            check_order(self.initial_diagnosis_date, self.alectinib_start_date, 'Дата начала терапии не может быть раньше даты диагноза')
            check_order(self.alectinib_start_date, self.alectinib_end_date, 'Дата окончания алектиниба не может быть раньше даты начала')
            check_order(self.alectinib_start_date, self.progression_date, 'Дата прогрессирования не может быть раньше начала лечения')
            check_order(self.alectinib_end_date, self.after_alectinib_progression_date, 'Дата прогрессирования после отмены не может быть раньше даты окончания терапии')

        # --- ROS1 ---
        if self.registry_type == 'ROS1':
            check_order(self.initial_diagnosis_date, self.metastatic_diagnosis_date, 'Дата установления мтс стадии не может быть раньше первичного диагноза')
            check_order(self.initial_diagnosis_date, self.radical_surgery_date, 'Дата операции не может быть раньше даты диагноза')
            check_order(self.radical_crt_start_date, self.radical_crt_end_date, 'Дата окончания ХЛТ не может быть раньше даты начала')
            check_order(self.radical_crt_end_date, self.radical_crt_consolidation_end_date, 'Окончание поддерживающей терапии должно быть после окончания ХЛТ')
            check_order(self.radical_surgery_date, self.relapse_date, 'Дата рецидива не может быть раньше даты операции')
            check_order(self.radical_crt_end_date, self.relapse_date, 'Дата рецидива не может быть раньше окончания ХЛТ')

            # Валидация линий терапии ROS1 (JSON)
            if self.metastatic_therapy_lines and isinstance(self.metastatic_therapy_lines, list):
                prev_line_end = None
                for i, line in enumerate(self.metastatic_therapy_lines):
                    start = parse_date(line.get('start_date'))
                    end = parse_date(line.get('end_date'))
                    prog = parse_date(line.get('progression_date'))
                    
                    if start and end and start > end:
                        raise ValueError(f'В линии терапии {i+1}: Дата окончания раньше даты начала')
                    
                    if start and prog and start > prog:
                        raise ValueError(f'В линии терапии {i+1}: Дата прогрессирования раньше даты начала лечения')
                        
                    if start and self.initial_diagnosis_date and start < self.initial_diagnosis_date:
                        raise ValueError(f'В линии терапии {i+1}: Дата начала лечения раньше даты диагноза')

            # Валидация периоперационной терапии ROS1 (JSON)
            if self.radical_perioperative_therapy and isinstance(self.radical_perioperative_therapy, list):
                for i, line in enumerate(self.radical_perioperative_therapy):
                    start = parse_date(line.get('start_date'))
                    end = parse_date(line.get('end_date'))
                    
                    if start and end and start > end:
                        raise ValueError(f'В периоперационной линии {i+1}: Дата окончания раньше начала')

        return self

class ClinicalRecordCreate(ClinicalRecordBase): pass
class ClinicalRecordUpdate(ClinicalRecordBase): pass
class ClinicalRecordResponse(ClinicalRecordBase):
    id: int
    patient_id: int
    age_at_diagnosis: Optional[int] = None
    class Config: from_attributes = True

class PatientBase(BaseModel): pass
class PatientCreate(PatientBase): clinical_record: ClinicalRecordCreate
class PatientUpdate(BaseModel): clinical_record: ClinicalRecordUpdate
class PatientResponse(BaseModel):
    id: int
    institution_id: int
    institution_name: str
    created_by: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    clinical_record: Optional[ClinicalRecordResponse] = None
    class Config: from_attributes = True

class DictionaryBase(BaseModel):
    category: str
    code: str
    value_ru: str
    sort_order: int = 0
    parent: Optional[str] = None
class DictionaryCreate(DictionaryBase): pass
class DictionaryUpdate(BaseModel):
    code: Optional[str] = None
    value_ru: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    parent: Optional[str] = None
class DictionaryResponse(DictionaryBase):
    id: int
    is_active: bool
    created_at: datetime
    class Config: from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    username: str
    action: str
    timestamp: datetime
    record_type: Optional[str] = None
    record_id: Optional[int] = None
    details: Optional[dict] = None
    class Config: from_attributes = True

class AnalyticsResponse(BaseModel):
    institution_id: int
    institution_name: str
    total_patients: int
    field_completion_rates: dict
    last_updated: Optional[datetime] = None
    class Config: from_attributes = True

class PatientSearch(BaseModel):
    patient_code: Optional[str] = None
    birth_date: Optional[str] = None
    institution_id: Optional[int] = None
    
class CompletionResponse(BaseModel):
    filled_fields: int
    total_fields: int
    completion_percentage: float
    class Config: from_attributes = True