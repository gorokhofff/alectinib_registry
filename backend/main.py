from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import os

from database import engine, get_db
from models import Base, User, Institution, Patient, ClinicalRecord, Dictionary, AuditLog
from schemas import (
    UserLogin, UserResponse, TokenResponse, UserCreate, UserUpdate,
    InstitutionCreate, InstitutionResponse,
    PatientCreate, PatientResponse, PatientUpdate, PatientSearch,
    ClinicalRecordCreate, ClinicalRecordResponse, ClinicalRecordUpdate,
    DictionaryCreate, DictionaryResponse, DictionaryUpdate,
    AuditLogResponse, AnalyticsResponse, CompletionResponse
)
from auth import create_access_token, get_current_user, require_admin

# Создание таблиц БД
Base.metadata.create_all(bind=engine)

# Инициализация FastAPI приложения
app = FastAPI(
    title="Alectinib Registry API",
    description="API для регистра пациентов, получающих терапию алектинибом",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В production заменить на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Утилиты для аудита
def create_audit_log(
    db: Session,
    user_id: int,
    action: str,
    record_type: str = None,
    record_id: int = None,
    details: dict = None
):
    """Создание записи в журнале аудита"""
    audit = AuditLog(
        user_id=user_id,
        action=action,
        record_type=record_type,
        record_id=record_id,
        details=details
    )
    db.add(audit)
    db.commit()

# ============================================================================
# АУТЕНТИФИКАЦИЯ
# ============================================================================

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Вход в систему"""
    user = db.query(User).filter(
        User.username == credentials.username,
        User.is_active == True
    ).first()
    
    if not user or not user.check_password(credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль"
        )
    
    # Обновление времени последнего входа
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Создание токена
    access_token = create_access_token(data={"sub": user.username})
    
    # Получение информации об учреждении
    institution = db.query(Institution).filter(Institution.id == user.institution_id).first()
    
    # Создание записи в аудите
    create_audit_log(db, user.id, "login")
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            username=user.username,
            role=user.role,
            institution_id=user.institution_id,
            institution_name=institution.name if institution else "",
            is_active=user.is_active,
            last_login=user.last_login
        )
    )

@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Получение информации о текущем пользователе"""
    institution = current_user.institution
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        institution_id=current_user.institution_id,
        institution_name=institution.name if institution else "",
        is_active=current_user.is_active,
        last_login=current_user.last_login
    )

# ============================================================================
# ПОЛЬЗОВАТЕЛИ
# ============================================================================

@app.get("/api/users", response_model=List[UserResponse])
async def get_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Получение списка всех пользователей (только для админов)"""
    users = db.query(User).options(joinedload(User.institution)).all()
    return [
        UserResponse(
            id=u.id,
            username=u.username,
            role=u.role,
            institution_id=u.institution_id,
            institution_name=u.institution.name if u.institution else "",
            is_active=u.is_active,
            last_login=u.last_login
        ) for u in users
    ]

@app.post("/api/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Создание нового пользователя (только для админов)"""
    # Проверка уникальности username
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким логином уже существует"
        )
    
    # Проверка существования учреждения
    institution = db.query(Institution).filter(Institution.id == user_data.institution_id).first()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Учреждение не найдено"
        )
    
    # Создание пользователя
    new_user = User(
        username=user_data.username,
        role=user_data.role,
        institution_id=user_data.institution_id
    )
    new_user.set_password(user_data.password)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Аудит
    create_audit_log(db, current_user.id, "create_user", "user", new_user.id)
    
    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        role=new_user.role,
        institution_id=new_user.institution_id,
        institution_name=institution.name,
        is_active=new_user.is_active,
        last_login=new_user.last_login
    )

@app.put("/api/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Обновление пользователя (только для админов)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Обновление полей
    if user_data.username is not None:
        # Проверка уникальности
        existing = db.query(User).filter(
            User.username == user_data.username,
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким логином уже существует"
            )
        user.username = user_data.username
    
    if user_data.password is not None:
        user.set_password(user_data.password)
    
    if user_data.role is not None:
        user.role = user_data.role
    
    if user_data.institution_id is not None:
        institution = db.query(Institution).filter(
            Institution.id == user_data.institution_id
        ).first()
        if not institution:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Учреждение не найдено"
            )
        user.institution_id = user_data.institution_id
    
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    db.commit()
    db.refresh(user)
    
    # Аудит
    create_audit_log(db, current_user.id, "update_user", "user", user.id)
    
    institution = db.query(Institution).filter(Institution.id == user.institution_id).first()
    return UserResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        institution_id=user.institution_id,
        institution_name=institution.name if institution else "",
        is_active=user.is_active,
        last_login=user.last_login
    )

@app.delete("/api/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Удаление пользователя (только для админов)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Нельзя удалить себя
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя удалить себя"
        )
    
    # Аудит
    create_audit_log(db, current_user.id, "delete_user", "user", user.id)
    
    db.delete(user)
    db.commit()
    
    return None

# ============================================================================
# УЧРЕЖДЕНИЯ
# ============================================================================

@app.get("/api/institutions", response_model=List[InstitutionResponse])
async def get_institutions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение списка всех учреждений"""
    institutions = db.query(Institution).filter(Institution.is_active == True).all()
    return institutions

@app.post("/api/institutions", response_model=InstitutionResponse, status_code=status.HTTP_201_CREATED)
async def create_institution(
    institution_data: InstitutionCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Создание нового учреждения (только для админов)"""
    # Проверка уникальности
    existing = db.query(Institution).filter(Institution.name == institution_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Учреждение с таким названием уже существует"
        )
    
    new_institution = Institution(**institution_data.dict())
    db.add(new_institution)
    db.commit()
    db.refresh(new_institution)
    
    # Аудит
    create_audit_log(db, current_user.id, "create_institution", "institution", new_institution.id)
    
    return new_institution

@app.put("/api/institutions/{institution_id}", response_model=InstitutionResponse)
async def update_institution(
    institution_id: int,
    institution_data: InstitutionCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Обновление учреждения (только для админов)"""
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Учреждение не найдено"
        )
    
    # Проверка уникальности названия
    existing = db.query(Institution).filter(
        Institution.name == institution_data.name,
        Institution.id != institution_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Учреждение с таким названием уже существует"
        )
    
    for field, value in institution_data.dict().items():
        setattr(institution, field, value)
    
    institution.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(institution)
    
    # Аудит
    create_audit_log(db, current_user.id, "update_institution", "institution", institution.id)
    
    return institution

@app.delete("/api/institutions/{institution_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_institution(
    institution_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Деактивация учреждения (только для админов)"""
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Учреждение не найдено"
        )
    
    # Проверка, есть ли связанные пользователи или пациенты
    has_users = db.query(User).filter(User.institution_id == institution_id).count() > 0
    has_patients = db.query(Patient).filter(Patient.institution_id == institution_id).count() > 0
    
    if has_users or has_patients:
        # Деактивация вместо удаления
        institution.is_active = False
        db.commit()
    else:
        # Полное удаление
        db.delete(institution)
        db.commit()
    
    # Аудит
    create_audit_log(db, current_user.id, "delete_institution", "institution", institution_id)
    
    return None

# ============================================================================
# ПАЦИЕНТЫ
# ============================================================================

@app.get("/api/patients", response_model=List[PatientResponse])
async def get_patients(
    search: Optional[str] = None,
    registry_type: Optional[str] = 'ALK',  # FIX: Set a default to prevent pulling all data if param missing
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение списка пациентов с учетом прав доступа"""
    query = db.query(Patient).options(
        joinedload(Patient.clinical_record),
        joinedload(Patient.institution)
    ).filter(Patient.is_active == True)
    
    # Фильтрация по учреждению для обычных пользователей
    if current_user.role != 'admin':
        query = query.filter(Patient.institution_id == current_user.institution_id)
    
    # FIX: Ensure registry_type filtering is robust
    if registry_type:
        query = query.filter(Patient.registry_type == registry_type)
    
    # Поиск по коду пациента
    if search:
        query = query.join(Patient.clinical_record).filter(
            ClinicalRecord.patient_code.ilike(f"%{search}%")
        )
    
    patients = query.order_by(Patient.created_at.desc()).all()
    
    # Ручное создание PatientResponse для каждого пациента
    return [
        PatientResponse(
            id=p.id,
            institution_id=p.institution_id,
            institution_name=p.institution.name if p.institution else "",
            created_by=p.created_by,
            registry_type=p.registry_type,
            is_active=p.is_active,
            created_at=p.created_at,
            updated_at=p.updated_at,
            clinical_record=ClinicalRecordResponse.from_orm(p.clinical_record) if p.clinical_record else None
        )
        for p in patients
    ]

@app.get("/api/patients/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение данных пациента"""
    patient = db.query(Patient).options(
        joinedload(Patient.clinical_record),
        joinedload(Patient.institution)
    ).filter(Patient.id == patient_id).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пациент не найден"
        )
    
    # Проверка прав доступа
    if current_user.role != 'admin' and patient.institution_id != current_user.institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен"
        )
    
    # Ручное создание PatientResponse
    return PatientResponse(
        id=patient.id,
        institution_id=patient.institution_id,
        institution_name=patient.institution.name if patient.institution else "",
        created_by=patient.created_by,
        registry_type=patient.registry_type,
        is_active=patient.is_active,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
        clinical_record=ClinicalRecordResponse.from_orm(patient.clinical_record) if patient.clinical_record else None
    )

@app.post("/api/patients", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient_data: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создание нового пациента"""
    # Создание пациента
    new_patient = Patient(
        institution_id=current_user.institution_id,
        created_by=current_user.id,
        registry_type=patient_data.registry_type or 'ALK'  # Set registry_type from request
    )
    db.add(new_patient)
    db.flush()  # Получаем ID пациента
    
    # Создание клинической записи
    clinical_data = patient_data.clinical_record.dict()
    
    # Расчет возраста при диагнозе
    if clinical_data.get('birth_date') and clinical_data.get('initial_diagnosis_date'):
        birth_date = clinical_data['birth_date']
        diagnosis_date = clinical_data['initial_diagnosis_date']
        age = (diagnosis_date - birth_date).days // 365
        clinical_data['age_at_diagnosis'] = age
    
    clinical_record = ClinicalRecord(
        patient_id=new_patient.id,
        **clinical_data
    )
    db.add(clinical_record)
    db.commit()
    db.refresh(new_patient)
    
    # Аудит
    create_audit_log(db, current_user.id, "create_patient", "patient", new_patient.id)
    
    # Загрузка связанных данных
    patient = db.query(Patient).options(
        joinedload(Patient.clinical_record),
        joinedload(Patient.institution)
    ).filter(Patient.id == new_patient.id).first()
    
    # Ручное создание PatientResponse
    return PatientResponse(
        id=patient.id,
        institution_id=patient.institution_id,
        institution_name=patient.institution.name if patient.institution else "",
        created_by=patient.created_by,
        registry_type=patient.registry_type,
        is_active=patient.is_active,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
        clinical_record=ClinicalRecordResponse.from_orm(patient.clinical_record) if patient.clinical_record else None
    )

@app.put("/api/patients/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновление данных пациента"""
    patient = db.query(Patient).options(
        joinedload(Patient.clinical_record)
    ).filter(Patient.id == patient_id).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пациент не найден"
        )
    
    # Проверка прав доступа
    if current_user.role != 'admin' and patient.institution_id != current_user.institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен"
        )
    
    # Обновление клинической записи
    clinical_data = patient_data.clinical_record.dict(exclude_unset=True)
    
    # Пересчет возраста при диагнозе
    if patient.clinical_record:
        birth_date = clinical_data.get('birth_date', patient.clinical_record.birth_date)
        diagnosis_date = clinical_data.get('initial_diagnosis_date', patient.clinical_record.initial_diagnosis_date)
        
        if birth_date and diagnosis_date:
            age = (diagnosis_date - birth_date).days // 365
            clinical_data['age_at_diagnosis'] = age
        
        for field, value in clinical_data.items():
            setattr(patient.clinical_record, field, value)
    
    patient.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(patient)
    
    # Аудит
    create_audit_log(db, current_user.id, "update_patient", "patient", patient.id)
    
    # Загрузка обновленных данных
    patient = db.query(Patient).options(
        joinedload(Patient.clinical_record),
        joinedload(Patient.institution)
    ).filter(Patient.id == patient.id).first()
    
    return PatientResponse(
        id=patient.id,
        institution_id=patient.institution_id,
        institution_name=patient.institution.name if patient.institution else "",
        created_by=patient.created_by,
        registry_type=patient.registry_type,
        is_active=patient.is_active,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
        clinical_record=ClinicalRecordResponse.from_orm(patient.clinical_record) if patient.clinical_record else None
    )

@app.delete("/api/patients/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Деактивация пациента"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пациент не найден"
        )
    
    # Проверка прав доступа
    if current_user.role != 'admin' and patient.institution_id != current_user.institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен"
        )
    
    # Деактивация вместо удаления
    patient.is_active = False
    patient.updated_at = datetime.utcnow()
    db.commit()
    
    # Аудит
    create_audit_log(db, current_user.id, "delete_patient", "patient", patient.id)
    
    return None

# Эндпоинт для расчета процента заполненности данных пациента
@app.get("/api/patients/{patient_id}/completion", response_model=CompletionResponse)
async def get_patient_completion(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение процента заполненности данных пациента"""
    patient = db.query(Patient).options(
        joinedload(Patient.clinical_record)
    ).filter(Patient.id == patient_id).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пациент не найден"
        )
    
    # Проверка прав доступа
    if current_user.role != 'admin' and patient.institution_id != current_user.institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен"
        )
    
    if not patient.clinical_record:
        return CompletionResponse(
            filled_fields=0,
            total_fields=0,
            completion_percentage=0.0
        )
    
    # Подсчет заполненных полей
    record = patient.clinical_record
    total_fields = 0
    filled_fields = 0
    
    # Список полей для подсчета (исключая служебные)
    fields_to_check = [
        'patient_code', 'gender', 'birth_date', 'height', 'weight', 'comorbidities',
        'smoking_status', 'initial_diagnosis_date', 'tnm_stage', 'histology',
        'alk_diagnosis_date', 'alk_methods', 'alk_fusion_variant', 'tp53_comutation',
        'ttf1_expression', 'had_previous_therapy', 'previous_therapy_types',
        'alectinib_start_date', 'stage_at_alectinib_start', 'ecog_at_start',
        'metastases_sites', 'cns_metastases', 'maximum_response', 'current_status',
        'last_contact_date'
    ]
    
    for field in fields_to_check:
        total_fields += 1
        value = getattr(record, field, None)
        if value is not None:
            if isinstance(value, list):
                if len(value) > 0:
                    filled_fields += 1
            else:
                filled_fields += 1
    
    completion_percentage = (filled_fields / total_fields * 100) if total_fields > 0 else 0
    
    return CompletionResponse(
        filled_fields=filled_fields,
        total_fields=total_fields,
        completion_percentage=round(completion_percentage, 2)
    )

# ============================================================================
# СПРАВОЧНИКИ
# ============================================================================

@app.get("/api/dictionaries")
async def get_dictionaries(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение справочников"""
    query = db.query(Dictionary).filter(Dictionary.is_active == True)
    
    if category:
        query = query.filter(Dictionary.category == category)
    
    dictionaries = query.order_by(Dictionary.category, Dictionary.sort_order).all()
    
    # Возвращаем массив записей справочника
    return [
        {
            "id": d.id,
            "category": d.category,
            "code": d.code,
            "value_ru": d.value_ru,
            "sort_order": d.sort_order
        }
        for d in dictionaries
    ]

# FIX #1: Добавлен новый endpoint для получения списка категорий справочников
@app.get("/api/dictionaries/categories")
async def get_dictionary_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение списка уникальных категорий справочников"""
    categories = db.query(Dictionary.category).filter(
        Dictionary.is_active == True
    ).distinct().all()
    
    # Преобразуем результат в список строк
    return [category[0] for category in categories]

@app.get("/api/dictionaries/all", response_model=List[DictionaryResponse])
async def get_all_dictionaries(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Получение всех записей справочников (для админов)"""
    dictionaries = db.query(Dictionary).order_by(
        Dictionary.category, 
        Dictionary.sort_order
    ).all()
    return dictionaries

@app.post("/api/dictionaries", response_model=DictionaryResponse, status_code=status.HTTP_201_CREATED)
async def create_dictionary(
    dict_data: DictionaryCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Создание записи в справочнике (только для админов)"""
    # Проверка уникальности
    existing = db.query(Dictionary).filter(
        Dictionary.category == dict_data.category,
        Dictionary.code == dict_data.code
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Запись с таким кодом уже существует в данной категории"
        )
    
    new_dict = Dictionary(**dict_data.dict())
    db.add(new_dict)
    db.commit()
    db.refresh(new_dict)
    
    # Аудит
    create_audit_log(db, current_user.id, "create_dictionary", "dictionary", new_dict.id)
    
    return new_dict

@app.put("/api/dictionaries/{dict_id}", response_model=DictionaryResponse)
async def update_dictionary(
    dict_id: int,
    dict_data: DictionaryUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Обновление записи в справочнике (только для админов)"""
    dict_item = db.query(Dictionary).filter(Dictionary.id == dict_id).first()
    
    if not dict_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Запись не найдена"
        )
    
    # Обновление полей
    for field, value in dict_data.dict(exclude_unset=True).items():
        setattr(dict_item, field, value)
    
    db.commit()
    db.refresh(dict_item)
    
    # Аудит
    create_audit_log(db, current_user.id, "update_dictionary", "dictionary", dict_id)
    
    return dict_item

@app.delete("/api/dictionaries/{dict_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dictionary(
    dict_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Деактивация записи в справочнике (только для админов)"""
    dict_item = db.query(Dictionary).filter(Dictionary.id == dict_id).first()
    
    if not dict_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Запись не найдена"
        )
    
    dict_item.is_active = False
    db.commit()
    
    # Аудит
    create_audit_log(db, current_user.id, "delete_dictionary", "dictionary", dict_id)
    
    return None

# ============================================================================
# TREATMENT SCHEMAS (for Therapy Builder)
# ============================================================================

@app.get("/api/treatment-schemas/{registry_type}")
async def get_treatment_schemas(
    registry_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение схем лечения для конкретного типа регистра (ALK или ROS1)
    Returns treatment options for building therapy plans
    """
    if registry_type.upper() not in ['ALK', 'ROS1']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный тип регистра. Допустимые значения: ALK, ROS1"
        )
    
    category = f"treatment_schemas_{registry_type.lower()}"
    
    schemas = db.query(Dictionary).filter(
        Dictionary.category == category,
        Dictionary.is_active == True
    ).order_by(Dictionary.sort_order).all()
    
    return [
        {
            "id": s.id,
            "code": s.code,
            "value_ru": s.value_ru,
            "sort_order": s.sort_order
        }
        for s in schemas
    ]

@app.get("/api/therapies/{registry_type}")
async def get_therapies(
    registry_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение доступных терапий для конкретного типа регистра
    Alias endpoint for treatment schemas
    """
    return await get_treatment_schemas(registry_type, current_user, db)

@app.get("/api/therapy-lines")
async def get_therapy_lines(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение линий терапии (1-я, 2-я, 3-я и т.д.)
    Generic for all registry types
    """
    lines = db.query(Dictionary).filter(
        Dictionary.category == "therapy_line",
        Dictionary.is_active == True
    ).order_by(Dictionary.sort_order).all()
    
    return [
        {
            "id": l.id,
            "code": l.code,
            "value_ru": l.value_ru,
            "sort_order": l.sort_order
        }
        for l in lines
    ]

@app.get("/api/diagnostic-methods/{registry_type}")
async def get_diagnostic_methods(
    registry_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение методов диагностики для конкретного типа регистра (ALK или ROS1)
    """
    if registry_type.upper() not in ['ALK', 'ROS1']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный тип регистра. Допустимые значения: ALK, ROS1"
        )
    
    category = f"{registry_type.lower()}_methods"
    
    methods = db.query(Dictionary).filter(
        Dictionary.category == category,
        Dictionary.is_active == True
    ).order_by(Dictionary.sort_order).all()
    
    return [
        {
            "id": m.id,
            "code": m.code,
            "value_ru": m.value_ru,
            "sort_order": m.sort_order
        }
        for m in methods
    ]

@app.get("/api/fusion-variants/{registry_type}")
async def get_fusion_variants(
    registry_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение вариантов фузии для конкретного типа регистра (ALK или ROS1)
    """
    if registry_type.upper() not in ['ALK', 'ROS1']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный тип регистра. Допустимые значения: ALK, ROS1"
        )
    
    category = f"{registry_type.lower()}_fusion_variant"
    
    variants = db.query(Dictionary).filter(
        Dictionary.category == category,
        Dictionary.is_active == True
    ).order_by(Dictionary.sort_order).all()
    
    return [
        {
            "id": v.id,
            "code": v.code,
            "value_ru": v.value_ru,
            "sort_order": v.sort_order
        }
        for v in variants
    ]

# ============================================================================
# АНАЛИТИКА
# ============================================================================

@app.get("/api/analytics")
async def get_analytics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Получение аналитики по заполненности данных (только для админов)"""
    
    # Общая статистика по учреждениям
    institutions = db.query(Institution).filter(Institution.is_active == True).all()
    
    analytics = []
    
    for institution in institutions:
        # Количество пациентов
        total_patients = db.query(Patient).filter(
            Patient.institution_id == institution.id,
            Patient.is_active == True
        ).count()
        
        # Статистика по заполненности полей
        patients = db.query(Patient).options(
            joinedload(Patient.clinical_record)
        ).filter(
            Patient.institution_id == institution.id,
            Patient.is_active == True
        ).all()
        
        field_completion = {}
        
        if total_patients > 0:
            # Список ключевых полей
            key_fields = [
                'patient_code', 'gender', 'birth_date', 'initial_diagnosis_date',
                'alk_diagnosis_date', 'alectinib_start_date', 'current_status'
            ]
            
            for field in key_fields:
                filled_count = sum(
                    1 for p in patients 
                    if p.clinical_record and getattr(p.clinical_record, field, None) is not None
                )
                field_completion[field] = round((filled_count / total_patients) * 100, 2)
        
        analytics.append({
            "institution_id": institution.id,
            "institution_name": institution.name,
            "total_patients": total_patients,
            "field_completion_rates": field_completion
        })
    
    return analytics

# ============================================================================
# ЖУРНАЛ АУДИТА
# ============================================================================

@app.get("/api/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Получение журнала аудита (только для админов)"""
    logs = db.query(AuditLog).options(
        joinedload(AuditLog.user)
    ).order_by(
        AuditLog.timestamp.desc()
    ).limit(limit).offset(offset).all()
    
    return [
        AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            username=log.user.username if log.user else "Unknown",
            action=log.action,
            timestamp=log.timestamp,
            record_type=log.record_type,
            record_id=log.record_id,
            details=log.details
        ) for log in logs
    ]

# ============================================================================
# ЗДОРОВЬЕ ПРИЛОЖЕНИЯ
# ============================================================================

@app.get("/api/health")
async def health_check():
    """Проверка состояния API"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "message": "Alectinib Registry API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }

# Запуск приложения
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)