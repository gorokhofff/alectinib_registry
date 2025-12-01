from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import date, datetime, timedelta
import json
import io
import csv

from database import get_db
from models import User, Institution, Patient, ClinicalRecord, Dictionary, AuditLog
from schemas import (
    UserLogin, UserResponse, TokenResponse, UserCreate, UserUpdate,
    InstitutionCreate, InstitutionResponse,
    PatientCreate, PatientUpdate, PatientResponse,
    ClinicalRecordCreate, ClinicalRecordUpdate, ClinicalRecordResponse,
    DictionaryCreate, DictionaryUpdate, DictionaryResponse,
    AuditLogResponse, AnalyticsResponse, PatientSearch, CompletionResponse
)
from auth import create_access_token, get_current_user, require_admin

app = FastAPI(
    title="Alectinib Registry API",
    description="API для регистра клинических случаев лечения алектинибом",
    version="1.0.0"
)

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Вспомогательная функция для логирования
def log_action(db: Session, user_id: int, action: str, record_type: str = None, 
               record_id: int = None, details: dict = None):
    log = AuditLog(
        user_id=user_id,
        action=action,
        record_type=record_type,
        record_id=record_id,
        details=details
    )
    db.add(log)
    db.commit()

# Вспомогательная функция для расчета возраста
def calculate_age(birth_date: datetime, diagnosis_date: datetime) -> int:
    age = diagnosis_date.year - birth_date.year
    if (diagnosis_date.month, diagnosis_date.day) < (birth_date.month, birth_date.day):
        age -= 1
    return age

# Вспомогательная функция для расчета процента заполнения
def calculate_completion_percentage(clinical_record) -> CompletionResponse:
    if not clinical_record:
        return CompletionResponse(filled_fields=0, total_fields=88, completion_percentage=0.0)
    
    # Определяем набор полей в зависимости от типа регистра записи
    reg_type = getattr(clinical_record, 'registry_type', 'ALK')
    
    common_fields = [
        'patient_code', 'gender', 'birth_date', 'height', 'weight', 
        'smoking_status', 'initial_diagnosis_date', 'tnm_stage', 
        'histology', 'current_status', 'last_contact_date'
    ]
    
    if reg_type == 'ROS1':
        specific_fields = [
            'ros1_fusion_variant', 'pdl1_status', 
            'radical_treatment_conducted', 
            'metastatic_diagnosis_date'
        ]
    else: # ALK
        specific_fields = [
            'alk_diagnosis_date', 'alk_fusion_variant',
            'alectinib_start_date', 'stage_at_alectinib_start', 'ecog_at_start',
            'maximum_response', 'alectinib_therapy_status'
        ]
    
    all_fields = common_fields + specific_fields
    
    # Array fields (check length > 0)
    array_fields = ['comorbidities', 'metastases_sites']
    if reg_type == 'ALK':
        array_fields.extend(['alk_methods', 'previous_therapy_types', 'progression_sites'])
    elif reg_type == 'ROS1':
        array_fields.extend(['metastatic_therapy_lines']) # Проверка наличия линий
    
    filled_fields = 0
    
    # Check scalar fields
    for field in all_fields:
        value = getattr(clinical_record, field, None)
        if value is not None and value != "":
            filled_fields += 1
            
    # Check array fields
    for field in array_fields:
        value = getattr(clinical_record, field, None)
        if value and isinstance(value, list) and len(value) > 0:
             filled_fields += 1
    
    total_fields = len(all_fields) + len(array_fields)
    completion_percentage = round((filled_fields / total_fields) * 100, 1) if total_fields > 0 else 0.0
    
    return CompletionResponse(
        filled_fields=filled_fields,
        total_fields=total_fields,
        completion_percentage=completion_percentage
    )

# ==================== AUTHENTICATION ====================

@app.post("/api/auth/login", response_model=TokenResponse)
def login(user_login: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_login.username).first()
    
    if not user or not user.check_password(user_login.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Log login
    log_action(db, user.id, "login")
    
    # Create access token
    access_token = create_access_token(data={"sub": user.username})
    
    institution_name = user.institution.name if user.institution else ""
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "institution_id": user.institution_id,
            "institution_name": institution_name,
            "is_active": user.is_active
        }
    }

@app.post("/api/auth/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    log_action(db, current_user.id, "logout")
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "institution_id": current_user.institution_id,
        "institution_name": current_user.institution.name,
        "is_active": current_user.is_active
    }

# ==================== USERS ====================

@app.post("/api/users", response_model=UserResponse)
def create_user(
    user_create: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_create.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create new user
    new_user = User(
        username=user_create.username,
        role=user_create.role,
        institution_id=user_create.institution_id
    )
    new_user.set_password(user_create.password)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    log_action(db, current_user.id, "create_user", "user", new_user.id)
    
    return {
        "id": new_user.id,
        "username": new_user.username,
        "role": new_user.role,
        "institution_id": new_user.institution_id,
        "institution_name": new_user.institution.name,
        "is_active": new_user.is_active
    }

@app.get("/api/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "institution_id": u.institution_id,
            "institution_name": u.institution.name,
            "is_active": u.is_active,
            "last_login": u.last_login
        }
        for u in users
    ]

@app.put("/api/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_update.username is not None:
        user.username = user_update.username
    if user_update.password is not None:
        user.set_password(user_update.password)
    if user_update.role is not None:
        user.role = user_update.role
    if user_update.institution_id is not None:
        user.institution_id = user_update.institution_id
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    
    db.commit()
    db.refresh(user)
    
    log_action(db, current_user.id, "update_user", "user", user.id)
    
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "institution_id": user.institution_id,
        "institution_name": user.institution.name,
        "is_active": user.is_active,
        "last_login": user.last_login
    }

@app.delete("/api/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Soft delete
    user.is_active = False
    db.commit()
    
    log_action(db, current_user.id, "delete_user", "user", user.id)
    
    return {"message": "User deleted successfully"}

# ==================== INSTITUTIONS ====================

@app.post("/api/institutions", response_model=InstitutionResponse)
def create_institution(
    institution: InstitutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    new_institution = Institution(**institution.dict())
    db.add(new_institution)
    db.commit()
    db.refresh(new_institution)
    
    log_action(db, current_user.id, "create_institution", "institution", new_institution.id)
    
    return new_institution

@app.get("/api/institutions", response_model=List[InstitutionResponse])
def list_institutions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    institutions = db.query(Institution).filter(Institution.is_active == True).all()
    return institutions

@app.put("/api/institutions/{institution_id}", response_model=InstitutionResponse)
def update_institution(
    institution_id: int,
    institution_update: InstitutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    for key, value in institution_update.dict().items():
        setattr(institution, key, value)
    
    db.commit()
    db.refresh(institution)
    
    log_action(db, current_user.id, "update_institution", "institution", institution.id)
    
    return institution

@app.delete("/api/institutions/{institution_id}")
def delete_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    # Soft delete
    institution.is_active = False
    db.commit()
    
    log_action(db, current_user.id, "delete_institution", "institution", institution.id)
    
    return {"message": "Institution deleted successfully"}

# ==================== AUTO-SAVE FUNCTIONALITY ====================

@app.patch("/api/patients/{patient_id}/auto-save")
def auto_save_patient(
    patient_id: int,
    field_updates: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Auto-save individual fields as user types"""
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_active == True).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check access rights
    if current_user.role != 'admin' and patient.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update clinical record fields
    clinical_record = patient.clinical_record
    for field, value in field_updates.items():
        if hasattr(clinical_record, field):
            if field.endswith('_date'):
                if isinstance(value, str):
                    if value == '':
                        value = None  # Преобразуем пустую строку в None
                    else:
                        try:
                            value = datetime.strptime(value, '%Y-%m-%d')
                        except ValueError:
                            pass
            setattr(clinical_record, field, value)
        
        patient.updated_at = datetime.utcnow()
        db.commit()
    
    return {"status": "saved", "fields": list(field_updates.keys())}

# ==================== PATIENTS ====================

@app.post("/api/patients", response_model=PatientResponse)
def create_patient(
    patient_data: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Create patient
    new_patient = Patient(
        institution_id=current_user.institution_id,
        created_by=current_user.id
    )
    db.add(new_patient)
    db.flush()
    
    # Create clinical record
    clinical_data = patient_data.clinical_record.dict()
    
    # Handle date fields - convert string to datetime if needed
    for key, value in clinical_data.items():
        if key.endswith('_date') and isinstance(value, str) and value:
            try:
                clinical_data[key] = datetime.strptime(value, '%Y-%m-%d')
            except ValueError:
                pass  # Keep as is if parsing fails
    
    # Calculate age if birth_date and initial_diagnosis_date are provided
    if clinical_data.get('birth_date') and clinical_data.get('initial_diagnosis_date'):
        clinical_data['age_at_diagnosis'] = calculate_age(
            clinical_data['birth_date'],
            clinical_data['initial_diagnosis_date']
        )
    
    clinical_record = ClinicalRecord(patient_id=new_patient.id, **clinical_data)
    db.add(clinical_record)
    
    db.commit()
    db.refresh(new_patient)
    
    log_action(db, current_user.id, "create_patient", "patient", new_patient.id)
    
    return {
        "id": new_patient.id,
        "institution_id": new_patient.institution_id,
        "institution_name": new_patient.institution.name,
        "created_by": new_patient.created_by,
        "is_active": new_patient.is_active,
        "created_at": new_patient.created_at,
        "updated_at": new_patient.updated_at,
        "clinical_record": clinical_record
    }

@app.get("/api/patients", response_model=List[PatientResponse])
def list_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    institution_id: Optional[int] = None,
    patient_code: Optional[str] = None,
    birth_date: Optional[str] = None,
    registry_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Patient).filter(Patient.is_active == True)
    
    if current_user.role != 'admin':
        query = query.filter(Patient.institution_id == current_user.institution_id)
    elif institution_id:
        query = query.filter(Patient.institution_id == institution_id)
    
    # Join with ClinicalRecord to filter by registry_type and search fields
    query = query.join(ClinicalRecord)

    if registry_type:
        query = query.filter(ClinicalRecord.registry_type == registry_type)
    
    if patient_code:
        query = query.filter(ClinicalRecord.patient_code.ilike(f"%{patient_code}%"))
    
    if birth_date:
        try:
            # Parse date in DD-MM-YYYY format
            search_date = datetime.strptime(birth_date, "%d-%m-%Y").date()
            query = query.filter(func.date(ClinicalRecord.birth_date) == search_date)
        except ValueError:
            try:
                # Try MM/DD/YYYY format
                search_date = datetime.strptime(birth_date, "%m/%d/%Y").date()
                query = query.filter(func.date(ClinicalRecord.birth_date) == search_date)
            except ValueError:
                pass  # Ignore invalid date formats
    
    patients = query.offset(skip).limit(limit).all()
    
    return [
        {
            "id": p.id,
            "institution_id": p.institution_id,
            "institution_name": p.institution.name,
            "created_by": p.created_by,
            "is_active": p.is_active,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "clinical_record": p.clinical_record
        }
        for p in patients
    ]

@app.get("/api/patients/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_active == True).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check access rights
    if current_user.role != 'admin' and patient.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "id": patient.id,
        "institution_id": patient.institution_id,
        "institution_name": patient.institution.name,
        "created_by": patient.created_by,
        "is_active": patient.is_active,
        "created_at": patient.created_at,
        "updated_at": patient.updated_at,
        "clinical_record": patient.clinical_record
    }

@app.put("/api/patients/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    patient_update: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_active == True).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check access rights
    if current_user.role != 'admin' and patient.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update clinical record
    if patient_update.clinical_record:
        clinical_record = patient.clinical_record
        update_data = patient_update.clinical_record.dict(exclude_unset=True)
        
        # Преобразование пустых строк в None для полей с датами
        for key, value in update_data.items():
            if key.endswith('_date'):
                if isinstance(value, str):
                    if value == '':
                        update_data[key] = None
                    else:
                        try:
                            update_data[key] = datetime.strptime(value, '%Y-%m-%d')
                        except ValueError:
                            pass  # Оставляем как есть, если не удалось распарсить
        
        # Пересчет возраста, если изменились даты рождения или диагноза
        if 'birth_date' in update_data or 'initial_diagnosis_date' in update_data:
            birth_date = update_data.get('birth_date', clinical_record.birth_date)
            diagnosis_date = update_data.get('initial_diagnosis_date', clinical_record.initial_diagnosis_date)
            if birth_date and diagnosis_date:
                update_data['age_at_diagnosis'] = calculate_age(birth_date, diagnosis_date)
        
        for key, value in update_data.items():
            setattr(clinical_record, key, value)
    
    patient.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(patient)
    
    log_action(db, current_user.id, "update_patient", "patient", patient.id)
    
    return {
        "id": patient.id,
        "institution_id": patient.institution_id,
        "institution_name": patient.institution.name,
        "created_by": patient.created_by,
        "is_active": patient.is_active,
        "created_at": patient.created_at,
        "updated_at": patient.updated_at,
        "clinical_record": patient.clinical_record
    }

@app.delete("/api/patients/{patient_id}")
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check access rights
    if current_user.role != 'admin' and patient.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Soft delete
    patient.is_active = False
    db.commit()
    
    log_action(db, current_user.id, "delete_patient", "patient", patient.id)
    
    return {"message": "Patient deleted successfully"}

# ==================== COMPLETION PERCENTAGE ====================

@app.get("/api/patients/{patient_id}/completion", response_model=CompletionResponse)
def get_patient_completion(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_active == True).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check access rights
    if current_user.role != 'admin' and patient.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return calculate_completion_percentage(patient.clinical_record)

# ==================== EXCEL EXPORT ====================

@app.get("/api/export/patients")
def export_patients_excel(
    institution_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Build query
    query = db.query(Patient).filter(Patient.is_active == True)
    
    if institution_id:
        query = query.filter(Patient.institution_id == institution_id)
    
    patients = query.all()
    
    # Create CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    header = [
        'ID пациента', 'Код пациента', 'Учреждение', 'Пол', 'Дата рождения', 
        'Возраст на момент диагноза', 'Рост', 'Вес', 'Статус курения',
        'Дата диагноза', 'TNM стадия', 'Гистология', 'Дата диагностики ALK',
        'Методы ALK', 'Вариант слияния ALK', 'TP53 комутация', 'TTF1 экспрессия',
        'Дата начала алектиниба', 'Стадия на момент начала', 'ECOG',
        'Максимальный ответ', 'Прогрессирование', 'Текущий статус',
        'Дата последнего контакта', 'Дата заполнения', 'Заполненность'
    ]
    writer.writerow(header)
    
    # Data rows
    for patient in patients:
        cr = patient.clinical_record
        if cr:
            completion = calculate_completion_percentage(cr)
            completion_str = f"{completion.filled_fields}/{completion.total_fields}"
            
            row = [
                patient.id,
                cr.patient_code or f"ID-{patient.id}",
                patient.institution.name,
                cr.gender or '',
                cr.birth_date.strftime('%d-%m-%Y') if cr.birth_date else '',
                cr.age_at_diagnosis or '',
                cr.height or '',
                cr.weight or '',
                cr.smoking_status or '',
                cr.initial_diagnosis_date.strftime('%d-%m-%Y') if cr.initial_diagnosis_date else '',
                cr.tnm_stage or '',
                cr.histology or '',
                cr.alk_diagnosis_date.strftime('%d-%m-%Y') if cr.alk_diagnosis_date else '',
                ', '.join(cr.alk_methods) if cr.alk_methods else '',
                cr.alk_fusion_variant or '',
                cr.tp53_comutation or '',
                cr.ttf1_expression or '',
                cr.alectinib_start_date.strftime('%d-%m-%Y') if cr.alectinib_start_date else '',
                cr.stage_at_alectinib_start or '',
                cr.ecog_at_start or '',
                cr.maximum_response or '',
                cr.progression_during_alectinib or '',
                cr.current_status or '',
                cr.last_contact_date.strftime('%d-%m-%Y') if cr.last_contact_date else '',
                cr.date_filled.strftime('%d-%m-%Y') if cr.date_filled else '',
                completion_str
            ]
        else:
            row = [patient.id, f"ID-{patient.id}", patient.institution.name] + [''] * 23
        
        writer.writerow(row)
    
    # Prepare response
    output.seek(0)
    
    # Convert to bytes
    csv_content = output.getvalue().encode('utf-8-sig')  # UTF-8 with BOM for Excel
    csv_io = io.BytesIO(csv_content)
    
    return StreamingResponse(
        io.BytesIO(csv_content),
        media_type='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename="patients_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        }
    )

# ==================== DICTIONARIES ====================

@app.post("/api/dictionaries", response_model=DictionaryResponse)
def create_dictionary(
    dictionary: DictionaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    new_dict = Dictionary(**dictionary.dict())
    db.add(new_dict)
    db.commit()
    db.refresh(new_dict)
    
    log_action(db, current_user.id, "create_dictionary", "dictionary", new_dict.id)
    
    return new_dict

@app.get("/api/dictionaries", response_model=List[DictionaryResponse])
def list_dictionaries(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Dictionary).filter(Dictionary.is_active == True)
    
    if category:
        query = query.filter(Dictionary.category == category)
    
    dictionaries = query.order_by(Dictionary.category, Dictionary.sort_order).all()
    return dictionaries

@app.get("/api/dictionaries/categories")
def list_dictionary_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    categories = db.query(Dictionary.category).distinct().all()
    return [cat[0] for cat in categories]

@app.put("/api/dictionaries/{dictionary_id}", response_model=DictionaryResponse)
def update_dictionary(
    dictionary_id: int,
    dictionary_update: DictionaryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    dictionary = db.query(Dictionary).filter(Dictionary.id == dictionary_id).first()
    if not dictionary:
        raise HTTPException(status_code=404, detail="Dictionary entry not found")
    
    update_data = dictionary_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dictionary, key, value)
    
    db.commit()
    db.refresh(dictionary)
    
    log_action(db, current_user.id, "update_dictionary", "dictionary", dictionary.id)
    
    return dictionary

@app.delete("/api/dictionaries/{dictionary_id}")
def delete_dictionary(
    dictionary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    dictionary = db.query(Dictionary).filter(Dictionary.id == dictionary_id).first()
    if not dictionary:
        raise HTTPException(status_code=404, detail="Dictionary entry not found")
    
    # Soft delete
    dictionary.is_active = False
    db.commit()
    
    log_action(db, current_user.id, "delete_dictionary", "dictionary", dictionary.id)
    
    return {"message": "Dictionary entry deleted successfully"}

# ==================== ANALYTICS ====================

@app.get("/api/analytics", response_model=List[AnalyticsResponse])
def get_analytics(
    registry_type: Optional[str] = None, # --- FIX: Добавлен параметр фильтрации
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Get all institutions
    institutions = db.query(Institution).filter(Institution.is_active == True).all()
    
    analytics_data = []
    
    for inst in institutions:
        # Build queries for patients
        patient_query = db.query(Patient).filter(
            Patient.institution_id == inst.id,
            Patient.is_active == True
        )
        
        # Build query for clinical records
        record_query = db.query(ClinicalRecord).join(Patient).filter(
            Patient.institution_id == inst.id,
            Patient.is_active == True
        )

        # --- FIX: Фильтрация по типу регистра ---
        if registry_type:
            # For patient count, we also need to join ClinicalRecord because registry_type is there
            patient_query = patient_query.join(ClinicalRecord).filter(ClinicalRecord.registry_type == registry_type)
            record_query = record_query.filter(ClinicalRecord.registry_type == registry_type)
        
        patient_count = patient_query.count()
        records = record_query.all()
        
        # Calculate field completion rates
        if records:
            total_records = len(records)
            field_completion = {}
            
            # Выбор полей в зависимости от регистра
            if registry_type == 'ROS1':
                important_fields = [
                    'gender', 'birth_date', 'height', 'weight',
                    'initial_diagnosis_date', 'tnm_stage', 'histology',
                    'ros1_fusion_variant', 'pdl1_status',
                    'radical_treatment_conducted',
                    'metastatic_diagnosis_date',
                    'current_status', 'last_contact_date'
                ]
            else: # ALK (default)
                important_fields = [
                    'gender', 'birth_date', 'height', 'weight',
                    'initial_diagnosis_date', 'tnm_stage', 'histology',
                    'alk_diagnosis_date', 'alk_methods',
                    'alectinib_start_date', 'ecog_at_start',
                    'current_status', 'last_contact_date'
                ]
            
            for field in important_fields:
                filled_count = sum(1 for r in records if getattr(r, field) is not None)
                field_completion[field] = round((filled_count / total_records) * 100, 1)
        else:
            field_completion = {}
        
        analytics_data.append({
            "institution_id": inst.id,
            "institution_name": inst.name,
            "total_patients": patient_count,
            "field_completion_rates": field_completion,
            "last_updated": inst.updated_at
        })
    
    return analytics_data

# ==================== AUDIT LOG ====================

@app.get("/api/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "username": log.user.username,
            "action": log.action,
            "timestamp": log.timestamp,
            "record_type": log.record_type,
            "record_id": log.record_id,
            "details": log.details
        }
        for log in logs
    ]

# ==================== HEALTH CHECK ====================

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)