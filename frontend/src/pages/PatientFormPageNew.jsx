import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { patientService } from '../services/patientService'
import { dictionaryService } from '../services/dictionaryService'
import { useRegistry } from '../contexts/RegistryContext'
import PatientFormSidebar from '../components/PatientFormSidebar'
import DateValidation from '../components/DateValidation'
import TNMSelect from '../components/TNMSelect'
import TherapyBuilder from '../components/TherapyBuilder'
import TherapyLinesTable from '../components/TherapyLinesTable'
import './PatientFormPageNew.css'

function PatientFormPageNew({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { registryType } = useRegistry()
  const isEdit = !!id

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dictionaries, setDictionaries] = useState({})
  const [currentSection, setCurrentSection] = useState('current-status')
  
  const [formData, setFormData] = useState({
    // Общие
    patient_code: '',
    date_filled: new Date().toISOString().split('T')[0],
    current_status: '',
    last_contact_date: '',
    
    // Базовые
    gender: '',
    birth_date: '',
    height: '',
    weight: '',
    comorbidities: [],
    comorbidities_other_text: '',
    smoking_status: '',
    
    // Диагноз
    initial_diagnosis_date: '',
    tnm_stage: '',
    metastatic_disease_date: '',
    histology: '',
    
    // ALK
    alk_diagnosis_date: '',
    alk_methods: [],
    alk_fusion_variant: '',
    tp53_comutation: '',
    ttf1_expression: '',
    
    // Терапия
    had_previous_therapy: false,
    no_previous_therapy: false,
    previous_therapy_types: [],
    previous_therapy_start_date: '',
    previous_therapy_end_date: '',
    previous_therapy_response: '',
    previous_therapy_stop_reason: '',
    alectinib_start_date: '',
    stage_at_alectinib_start: '',
    ecog_at_start: '',
    metastases_sites: [],
    metastases_sites_other_text: '',
    cns_metastases: false,
    cns_measurable: '',
    cns_symptomatic: '',
    cns_radiotherapy: '',
    cns_radiotherapy_timing: '', 
    alectinib_therapy_status: '', 
    maximum_response: '',
    earliest_response_date: '',
    intracranial_response: '',
    
    // Прогрессирование (без отмены)
    progression_during_alectinib: '',
    local_treatment_at_progression: '',
    progression_sites: [],
    progression_sites_other_text: '',
    progression_date: '',
    continued_after_progression: false,
    
    // Завершение
    alectinib_end_date: '',
    alectinib_stop_reason: '',
    had_treatment_interruption: false,
    interruption_reason: '',
    interruption_duration_months: '',
    had_dose_reduction: false,
    
    // --- UI State для Прогрессирования после отмены ---
    has_after_alectinib_progression: null, // null/true/false - не сохраняется в БД напрямую, вычисляется

    // --- ПОЛЯ ПРОГРЕССИРОВАНИЯ ПОСЛЕ ОТМЕНЫ ---
    after_alectinib_progression_type: '',
    after_alectinib_progression_sites: [],
    after_alectinib_progression_sites_other_text: '',
    after_alectinib_progression_date: '',
    
    // Следующая линия
    next_line_treatments: [],
    next_line_treatments_other_text: '',
    next_line_start_date: '',
    next_line_end_date: '',
    progression_on_next_line: false,
    next_line_progression_type: '',
    next_line_progression_sites: [],
    next_line_progression_sites_other_text: '',
    progression_on_next_line_date: '',
    total_lines_after_alectinib: '',

    // ROS1
    ros1_fusion_variant: '',
    pdl1_status: '',
    pdl1_tps: '',
    radical_treatment_conducted: null,
    radical_surgery_conducted: false,
    radical_surgery_date: '',
    radical_surgery_type: '',
    radical_surgery_type_other: '',
    radical_crt_conducted: false,
    radical_crt_start_date: '',
    radical_crt_end_date: '',
    radical_crt_consolidation: false,
    radical_crt_consolidation_drug: '',
    radical_crt_consolidation_end_date: '',
    radical_perioperative_therapy: [], 
    radical_treatment_outcome: '',
    relapse_date: '',
    metastatic_diagnosis_date: '',
    metastatic_therapy_lines: []
  })

  // Date validation rules
  // type: 'before' -> Ошибка, если текущая дата < compareWith (раньше)
  // type: 'after' -> Ошибка, если текущая дата > compareWith (позже)
  const dateValidationRules = {
    // --- ОБЩИЕ ---
    birth_date: [
      {
        type: 'after', // Ошибка если родился ПОСЛЕ диагноза
        compareWith: 'initial_diagnosis_date',
        message: 'Дата рождения не может быть позже даты диагноза'
      }
    ],
    last_contact_date: [
      {
        type: 'before', // Ошибка если контакт ДО диагноза
        compareWith: 'initial_diagnosis_date',
        message: 'Дата последнего контакта/смерти не может быть раньше даты диагноза'
      }
    ],

    // --- ALK ---
    alk_diagnosis_date: [
      {
        type: 'before',
        compareWith: 'initial_diagnosis_date', 
        message: 'Дата диагностики ALK не может быть раньше даты первичного диагноза'
      }
    ],
    alectinib_start_date: [
      {
        type: 'before',
        compareWith: 'initial_diagnosis_date',
        message: 'Лечение не может начаться раньше постановки диагноза'
      }
    ],
    alectinib_end_date: [
      {
        type: 'before',
        compareWith: 'alectinib_start_date',
        message: 'Дата окончания не может быть раньше даты начала'
      }
    ],
    progression_date: [
      {
        type: 'before',
        compareWith: 'alectinib_start_date',
        message: 'Прогрессирование не может быть раньше начала лечения'
      }
    ],
    after_alectinib_progression_date: [
      {
        type: 'before',
        compareWith: 'alectinib_end_date',
        message: 'Прогрессирование после отмены должно быть позже даты отмены'
      }
    ],
    
    // --- ПРЕДЫДУЩАЯ ТЕРАПИЯ ---
    previous_therapy_end_date: [
      {
        type: 'before',
        compareWith: 'previous_therapy_start_date',
        message: 'Дата окончания не может быть раньше даты начала'
      }
    ],

    // --- ROS1 / РАДИКАЛЬНОЕ ЛЕЧЕНИЕ ---
    radical_surgery_date: [
      {
        type: 'before',
        compareWith: 'initial_diagnosis_date',
        message: 'Операция не может быть раньше диагноза'
      }
    ],
    radical_crt_end_date: [
      {
        type: 'before',
        compareWith: 'radical_crt_start_date',
        message: 'Окончание ХЛТ не может быть раньше начала'
      }
    ],
    radical_crt_consolidation_end_date: [
      {
        type: 'before',
        compareWith: 'radical_crt_end_date',
        message: 'Поддерживающая терапия не может заканчиваться раньше окончания ХЛТ'
      }
    ],
    relapse_date: [
      {
        type: 'before',
        compareWith: 'initial_diagnosis_date',
        message: 'Рецидив не может быть раньше диагноза'
      }
    ],
    metastatic_diagnosis_date: [
      {
        type: 'before',
        compareWith: 'initial_diagnosis_date',
        message: 'Дата метастазирования не может быть раньше первичного диагноза'
      }
    ]
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await dictionaryService.getDictionaries()
        const grouped = {}
        data.forEach(item => {
          if (!grouped[item.category]) grouped[item.category] = []
          grouped[item.category].push(item)
        })
        setDictionaries(grouped)
      } catch (err) { console.error(err) }
    }
    loadData()
    if (isEdit) loadPatient()
  }, [id])

  const loadPatient = async () => {
    try {
      setLoading(true)
      const patient = await patientService.getPatient(id)
      if (patient.clinical_record) {
        const cr = { ...patient.clinical_record }
        Object.keys(cr).forEach(key => {
            if (key.includes('date') && cr[key] && typeof cr[key] === 'string') {
                cr[key] = cr[key].split('T')[0]
            }
        })
        if (typeof cr.radical_perioperative_therapy === 'string') {
            try { cr.radical_perioperative_therapy = JSON.parse(cr.radical_perioperative_therapy) } catch { cr.radical_perioperative_therapy = [] }
        }
        if (typeof cr.metastatic_therapy_lines === 'string') {
            try { cr.metastatic_therapy_lines = JSON.parse(cr.metastatic_therapy_lines) } catch { cr.metastatic_therapy_lines = [] }
        }

        // --- Инициализация UI State для радиокнопки ---
        if (cr.after_alectinib_progression_type || cr.after_alectinib_progression_date) {
            cr.has_after_alectinib_progression = true
        } else {
            cr.has_after_alectinib_progression = false
        }

        setFormData(cr)
      }
    } catch { setError('Ошибка загрузки') } 
    finally { setLoading(false) }
  }

  const sectionFieldsMap = {
    'current-status': ['current_status', 'last_contact_date'],
    'patient-basic': ['patient_code', 'date_filled', 'gender', 'birth_date', 'height', 'weight'],
    'diagnosis-alk': ['initial_diagnosis_date', 'tnm_stage', 'histology', 'alk_diagnosis_date', 'alk_fusion_variant'],
    'previous-therapy': ['had_previous_therapy'], 
    'alectinib-complete': ['alectinib_start_date', 'stage_at_alectinib_start', 'alectinib_therapy_status'],
    'next-line': ['next_line_treatments'],
    'diagnosis-ros1': ['initial_diagnosis_date', 'tnm_stage', 'ros1_fusion_variant'],
    'pdl1-status': ['pdl1_status'],
    'radical-treatment': ['radical_treatment_conducted'],
    'metastatic-therapy': ['metastatic_diagnosis_date']
  }

  const calculateSectionStatus = (sectionId) => {
    const fields = sectionFieldsMap[sectionId] || []
    if (fields.length === 0) return ''
    let filledCount = 0
    fields.forEach(f => {
        const val = formData[f]
        if (Array.isArray(val) ? val.length > 0 : (val !== null && val !== '' && val !== undefined)) filledCount++
    })
    const percentage = (filledCount / fields.length) * 100
    if (percentage < 50) return 'red'
    if (percentage < 100) return 'yellow'
    return 'green'
  }

  const enrichSections = (sectionsList) => {
    return sectionsList.map(s => ({...s, status: calculateSectionStatus(s.id)}))
  }

  const alkSectionsRaw = [
    { id: 'current-status', title: 'Текущий статус', icon: '📊' },
    { id: 'patient-basic', title: 'Базовые данные', icon: '👤' },
    { id: 'diagnosis-alk', title: 'Диагноз и ALK', icon: '🔍' },
    { id: 'previous-therapy', title: 'Предыдущая терапия', icon: '💊' },
    { id: 'alectinib-complete', title: 'Лечение алектинибом', icon: '🎯' },
    { id: 'next-line', title: 'Следующая линия', icon: '➡️' }
  ]

  const ros1StructureRaw = [
    { groupTitle: 'Основная информация', sections: [{ id: 'current-status', title: 'Текущий статус', icon: '📊' }, { id: 'patient-basic', title: 'Базовые данные', icon: '👤' }] },
    { groupTitle: 'Диагностика', sections: [{ id: 'diagnosis-ros1', title: 'Диагноз и ROS1', icon: '🔍' }, { id: 'pdl1-status', title: 'PD-L1 статус', icon: '🧬' }] },
    { groupTitle: 'Радикальное лечение', sections: [{ id: 'radical-treatment', title: 'Радикальное лечение', icon: '⚕️' }] },
    { groupTitle: 'Метастатическая фаза', sections: [{ id: 'metastatic-therapy', title: 'Линии терапии', icon: '💊' }] }
  ]

  const sections = registryType === 'ROS1' ? ros1StructureRaw.flatMap(g => g.sections) : alkSectionsRaw

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    let val = value
    if (type === 'checkbox') val = checked
    
    // Безопасное получение атрибута data-type
    if (e.target.getAttribute && e.target.getAttribute('data-type') === 'bool-radio') {
        val = value === 'true'
    }

    setFormData(prev => {
        const updated = { ...prev, [name]: val }
        
        // Авто-сброс при изменении "Прогрессирование после отмены"
        if (name === 'has_after_alectinib_progression' && val === false) {
             updated.after_alectinib_progression_type = ''
             updated.after_alectinib_progression_date = null
             updated.after_alectinib_progression_sites = []
             updated.after_alectinib_progression_sites_other_text = ''
        }

        if (name === 'radical_surgery_conducted' && !val) {
            updated.radical_surgery_date = null
            updated.radical_surgery_type = ''
        }
        if (name === 'radical_crt_conducted' && !val) {
            updated.radical_crt_start_date = null
            updated.radical_crt_end_date = null
            updated.radical_crt_consolidation = false
        }
        return updated
    })
    
    if (name === 'metastases_sites' && Array.isArray(val) && val.includes('CNS')) {
         setFormData(prev => ({ ...prev, cns_metastases: true }))
    }
    if (name === 'no_previous_therapy' && checked) {
      setFormData(prev => ({ ...prev, had_previous_therapy: false, previous_therapy_types: [] }))
    }
  }

  const handleMultiSelect = (name, value) => {
    setFormData(prev => {
      const current = prev[name] || []
      const newValues = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
      const updated = { ...prev, [name]: newValues }
      if (name === 'metastases_sites') {
          updated.cns_metastases = newValues.includes('CNS')
      }
      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
        const preparedData = { ...formData }
        // Удаляем UI-only поле перед отправкой
        delete preparedData.has_after_alectinib_progression
        
        Object.keys(preparedData).forEach(key => {
            if (preparedData[key] === '') preparedData[key] = null
            if (key.includes('date') && preparedData[key] && !preparedData[key].includes('T')) preparedData[key] += 'T00:00:00'
        })
        if (Array.isArray(preparedData.radical_perioperative_therapy)) preparedData.radical_perioperative_therapy = JSON.stringify(preparedData.radical_perioperative_therapy)
        if (Array.isArray(preparedData.metastatic_therapy_lines)) preparedData.metastatic_therapy_lines = JSON.stringify(preparedData.metastatic_therapy_lines)

        if (!isEdit && registryType) preparedData.registry_type = registryType
        const payload = { clinical_record: preparedData }
        
        let savedId = id
        if (isEdit) await patientService.updatePatient(id, payload)
        else {
            const res = await patientService.createPatient(payload)
            savedId = res?.id
        }

        const currentIndex = sections.findIndex(s => s.id === currentSection)
        if (currentIndex < sections.length - 1) {
             if (!isEdit && savedId) {
                navigate(`/patients/${savedId}`)
                setCurrentSection(sections[currentIndex + 1].id)
             } else {
                setCurrentSection(sections[currentIndex + 1].id)
             }
        } else {
             navigate('/patients')
        }
    } catch (err) { console.error(err); setError('Ошибка сохранения') } 
    finally { setSaving(false) }
  }

  const renderSelect = (name, category, label, required=false) => (
    <div className="form-group">
      <label className="form-label">{label}{required && <span className="required">*</span>}</label>
      <select name={name} value={formData[name] || ''} onChange={handleChange} className="form-select" required={required}>
        <option value="">Выберите...</option>
        {(dictionaries[category] || []).map(opt => <option key={opt.code} value={opt.code}>{opt.value_ru}</option>)}
      </select>
    </div>
  )

  const renderMultiSelect = (name, category, label) => {
    let options = dictionaries[category] || []
    const selected = formData[name] || []
    if (name === 'metastases_sites') options = options.filter(opt => opt.code !== 'CNS')
    return (
      <div className="form-group"><label className="form-label">{label}</label><div className="checkbox-group">{options.map(opt => (<label key={opt.code} className="checkbox-label"><input type="checkbox" checked={selected.includes(opt.code)} onChange={() => handleMultiSelect(name, opt.code)} /><span>{opt.value_ru}</span></label>))}</div></div>
    )
  }

  const renderSection = () => {
    const isROS1 = registryType === 'ROS1'
    const isALK = registryType === 'ALK'

    switch(currentSection) {
      case 'current-status': return <div className="card"><h3>Текущий статус</h3><div className="grid grid-2">{renderSelect('current_status', 'current_status', 'Статус', true)}<DateValidation name="last_contact_date" label="Дата последнего контакта" value={formData.last_contact_date} onChange={handleChange} validationRules={dateValidationRules.last_contact_date} otherDates={formData} /></div></div>
      case 'patient-basic': return (
        <div className="card"><h3>Базовые данные</h3>
          <div className="grid grid-2">
            <div className="form-group"><label className="form-label">Код пациента</label><input type="text" name="patient_code" value={formData.patient_code} onChange={handleChange} className="form-input" /></div>
            <DateValidation name="date_filled" label="Дата заполнения" value={formData.date_filled} onChange={handleChange} />
            <div className="form-group"><label className="form-label">Пол</label><select name="gender" value={formData.gender} onChange={handleChange} className="form-select"><option value="">...</option><option value="м">М</option><option value="ж">Ж</option></select></div>
            <DateValidation name="birth_date" label="Дата рождения" value={formData.birth_date} onChange={handleChange} validationRules={dateValidationRules.birth_date} otherDates={formData} />
            
            <div className="form-group">
              <label className="form-label">Рост (см)</label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleChange}
                className={`form-input ${formData.height && (formData.height < 30 || formData.height > 250) ? 'error-border' : ''}`}
                min="30"
                max="250"
                placeholder="см"
              />
              {formData.height && (formData.height < 30 || formData.height > 250) && (
                <span className="form-error-text" style={{color: 'red', fontSize: '12px', display: 'block', marginTop: '4px'}}>
                  Проверьте значение (30-250 см)
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Вес (кг)</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className={`form-input ${formData.weight && (formData.weight < 10 || formData.weight > 300) ? 'error-border' : ''}`}
                min="10"
                max="300"
                placeholder="кг"
              />
              {formData.weight && (formData.weight < 10 || formData.weight > 300) && (
                <span className="form-error-text" style={{color: 'red', fontSize: '12px', display: 'block', marginTop: '4px'}}>
                  Проверьте значение (10-300 кг)
                </span>
              )}
            </div>
          </div>
          {renderMultiSelect('comorbidities', 'comorbidities', 'Сопутствующие заболевания')}
          {formData.comorbidities?.includes('OTHER') && <div className="form-group"><label className="form-label">Укажите другое</label><input type="text" name="comorbidities_other_text" value={formData.comorbidities_other_text} onChange={handleChange} className="form-input"/></div>}
          {renderSelect('smoking_status', 'smoking_status', 'Статус курения')}
        </div>
      )
      
      // ALK
      case 'diagnosis-alk': if (!isALK) return null; return <><div className="card"><h3>Диагноз</h3><div className="grid grid-2"><DateValidation name="initial_diagnosis_date" label="Дата диагноза" value={formData.initial_diagnosis_date} onChange={handleChange} /><TNMSelect name="tnm_stage" label="Стадия TNM" value={formData.tnm_stage} onChange={handleChange} options={dictionaries.tnm_stage} /><div className="form-group"><label className="form-label">Дата мтс</label><DateValidation name="metastatic_disease_date" label="" value={formData.metastatic_disease_date} onChange={handleChange} /></div>{renderSelect('histology', 'histology', 'Гистология')}</div></div><div className="card"><h3>ALK Диагностика</h3><div className="grid grid-2"><DateValidation name="alk_diagnosis_date" label="Дата ALK" value={formData.alk_diagnosis_date} onChange={handleChange} validationRules={dateValidationRules.alk_diagnosis_date} otherDates={formData} />{renderSelect('alk_fusion_variant', 'alk_fusion_variant', 'Вариант')}{renderSelect('tp53_comutation', 'yes_no_unknown', 'TP53')}{renderSelect('ttf1_expression', 'yes_no_unknown', 'TTF1')}</div>{renderMultiSelect('alk_methods', 'alk_methods', 'Метод')}</div></>
      case 'previous-therapy': return <div className="card"><h3>Предыдущая терапия</h3><div className="form-group"><label className="checkbox-label"><input type="checkbox" name="no_previous_therapy" checked={formData.no_previous_therapy} onChange={handleChange}/><span>Не было</span></label></div>{!formData.no_previous_therapy && <><div className="form-group"><label className="checkbox-label"><input type="checkbox" name="had_previous_therapy" checked={formData.had_previous_therapy} onChange={handleChange}/><span>Была терапия</span></label></div>{formData.had_previous_therapy && <><div className="form-group"><label className="form-label">Тип терапии *</label><select value={formData.previous_therapy_types?.[0] || ''} onChange={(e) => setFormData(p => ({ ...p, previous_therapy_types: [e.target.value] }))} className="form-select"><option value="">Выберите...</option>{(dictionaries.previous_therapy_types || []).map(opt => <option key={opt.code} value={opt.code}>{opt.value_ru}</option>)}</select></div><div className="grid grid-2"><DateValidation name="previous_therapy_start_date" label="Начало" value={formData.previous_therapy_start_date} onChange={handleChange} /><DateValidation name="previous_therapy_end_date" label="Конец" value={formData.previous_therapy_end_date} onChange={handleChange} validationRules={dateValidationRules.previous_therapy_end_date} otherDates={formData} />{renderSelect('previous_therapy_response', 'response', 'Эффект')}{renderSelect('previous_therapy_stop_reason', 'previous_therapy_stop_reason', 'Причина отмены')}</div></>}</>}</div>
      case 'alectinib-complete': return <><div className="card"><h3>Лечение алектинибом</h3><div className="grid grid-2"><DateValidation name="alectinib_start_date" label="Начало" value={formData.alectinib_start_date} onChange={handleChange} validationRules={dateValidationRules.alectinib_start_date} otherDates={formData} />{renderSelect('stage_at_alectinib_start', 'stage_at_alectinib_start', 'Стадия')}{renderSelect('alectinib_therapy_status', 'alectinib_therapy_status', 'Статус терапии', true)}<div className="form-group"><label className="form-label">ECOG</label><input type="number" name="ecog_at_start" value={formData.ecog_at_start} onChange={handleChange} className="form-input" min="0" max="4"/></div></div>{renderMultiSelect('metastases_sites', 'metastases_sites', 'Локализация мтс')}{formData.metastases_sites?.includes('OTHER') && <div className="form-group"><input type="text" name="metastases_sites_other_text" value={formData.metastases_sites_other_text} onChange={handleChange} className="form-input" placeholder="Уточните"/></div>}<div className="form-group"><label className="checkbox-label"><input type="checkbox" name="cns_metastases" checked={formData.cns_metastases} onChange={handleChange}/><span>Мтс в ЦНС</span></label></div>{formData.cns_metastases && <><div className="grid grid-3">{renderSelect('cns_measurable', 'cns_measurable', 'Измеряемость')}{renderSelect('cns_symptomatic', 'cns_symptomatic', 'Симптоматичность')}{renderSelect('cns_radiotherapy', 'cns_radiotherapy', 'Радиотерапия')}</div><div className="form-group"><label className="form-label">Когда была радиотерапия ЦНС?</label><select name="cns_radiotherapy_timing" value={formData.cns_radiotherapy_timing || ''} onChange={handleChange} className="form-select"><option value="">Выберите...</option><option value="before">До начала лечения алектинибом</option><option value="during">Во время лечения алектинибом</option><option value="none">Не проводилась</option></select></div></>}</div><div className="card"><h3>Эффективность</h3><div className="grid grid-2">{renderSelect('maximum_response', 'response', 'Макс. ответ')}<DateValidation name="earliest_response_date" label="Дата достижения наибольшего ответа" value={formData.earliest_response_date} onChange={handleChange} /></div></div><div className="card"><h3>Прогрессирование без отмены терапии Алектинибом</h3><div className="grid grid-2">{renderSelect('progression_during_alectinib', 'progression_type', 'Тип')}{formData.progression_during_alectinib && formData.progression_during_alectinib !== 'NONE' && <>{renderSelect('local_treatment_at_progression', 'local_treatment_at_progression', 'Локальное лечение')}<DateValidation name="progression_date" label="Дата" value={formData.progression_date} onChange={handleChange} validationRules={dateValidationRules.progression_date} otherDates={formData} /><div className="form-group"><label className="checkbox-label"><input type="checkbox" name="continued_after_progression" checked={formData.continued_after_progression} onChange={handleChange}/><span>Продолжение терапии</span></label></div></>}</div>{formData.progression_during_alectinib && formData.progression_during_alectinib !== 'NONE' && <>{renderMultiSelect('progression_sites', 'progression_sites', 'Локализация прогрессирования')}{formData.progression_sites?.includes('OTHER') && <div className="form-group"><input type="text" name="progression_sites_other_text" value={formData.progression_sites_other_text} onChange={handleChange} className="form-input" placeholder="Уточните"/></div>}</>}</div>

      {/* ПОЛЯ after_alectinib_progression_* */}
      {formData.alectinib_therapy_status === 'stopped' && (
        <div className="card">
            <h3>Завершение и Прогрессирование после отмены</h3>
            
            <div className="grid grid-2">
                <DateValidation name="alectinib_end_date" label="Дата окончания" value={formData.alectinib_end_date} onChange={handleChange} validationRules={dateValidationRules.alectinib_end_date} otherDates={formData} />
                {renderSelect('alectinib_stop_reason', 'alectinib_stop_reason', 'Причина')}
            </div>
            
            {/* НОВАЯ РАДИОКНОПКА + БЛОК */}
            <div className="form-group" style={{marginTop: '15px'}}>
                <label className="form-label">Зафиксировано прогрессирование после отмены?</label>
                <div className="radio-group" style={{display: 'flex', gap: '20px', marginTop: '5px'}}>
                    <label className="radio-label" style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                        <input type="radio" name="has_after_alectinib_progression" value="true" checked={formData.has_after_alectinib_progression === true} onChange={handleChange} data-type="bool-radio" style={{marginRight: '8px'}}/>Да
                    </label>
                    <label className="radio-label" style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                        <input type="radio" name="has_after_alectinib_progression" value="false" checked={formData.has_after_alectinib_progression === false} onChange={handleChange} data-type="bool-radio" style={{marginRight: '8px'}}/>Нет
                    </label>
                </div>
            </div>

            {formData.has_after_alectinib_progression === true && (
                <div className="subsection">
                    <h4>Параметры прогрессирования</h4>
                    <div className="grid grid-2">
                        <DateValidation name="after_alectinib_progression_date" label="Дата прогрессирования" value={formData.after_alectinib_progression_date} onChange={handleChange} validationRules={dateValidationRules.after_alectinib_progression_date} otherDates={formData} />
                        {renderSelect('after_alectinib_progression_type', 'progression_type', 'Тип прогрессирования')}
                    </div>
                    {renderMultiSelect('after_alectinib_progression_sites', 'progression_sites', 'Локализация')}
                    {formData.after_alectinib_progression_sites?.includes('OTHER') && (
                        <div className="form-group"><input type="text" name="after_alectinib_progression_sites_other_text" value={formData.after_alectinib_progression_sites_other_text} onChange={handleChange} className="form-input" placeholder="Уточните"/></div>
                    )}
                </div>
            )}

            <div className="form-group" style={{marginTop: 20}}><label className="checkbox-label"><input type="checkbox" name="had_treatment_interruption" checked={formData.had_treatment_interruption} onChange={handleChange}/><span>Перерывы в лечении</span></label></div>
            {formData.had_treatment_interruption && <div className="grid grid-2">{renderSelect('interruption_reason', 'interruption_reason', 'Причина перерыва')}<div className="form-group"><label className="form-label">Длительность (мес)</label><input type="number" name="interruption_duration_months" value={formData.interruption_duration_months} onChange={handleChange} className="form-input" step="0.1"/></div></div>}
            <div className="form-group"><label className="checkbox-label"><input type="checkbox" name="had_dose_reduction" checked={formData.had_dose_reduction} onChange={handleChange}/><span>Редукция дозы</span></label></div>
        </div>
      )}
      </>
      case 'next-line': if (formData.alectinib_therapy_status !== 'stopped') return <div className="card"><h3>Следующая линия</h3><p>Доступно после отмены терапии.</p></div>; return <div className="card"><h3>Следующая линия</h3>{renderMultiSelect('next_line_treatments', 'next_line_treatments', 'Лечение')}{formData.next_line_treatments?.includes('OTHER') && <div className="form-group"><input type="text" name="next_line_treatments_other_text" value={formData.next_line_treatments_other_text} onChange={handleChange} className="form-input" placeholder="Уточните"/></div>}<div className="grid grid-2"><DateValidation name="next_line_start_date" label="Начало" value={formData.next_line_start_date} onChange={handleChange} /><DateValidation name="next_line_end_date" label="Конец" value={formData.next_line_end_date} onChange={handleChange} /><div className="form-group"><label className="checkbox-label"><input type="checkbox" name="progression_on_next_line" checked={formData.progression_on_next_line} onChange={handleChange}/><span>Прогрессирование</span></label></div></div>{formData.progression_on_next_line && <><div className="grid grid-2"><DateValidation name="progression_on_next_line_date" label="Дата прогрессирования" value={formData.progression_on_next_line_date} onChange={handleChange} />{renderSelect('next_line_progression_type', 'progression_type', 'Тип')}</div>{renderMultiSelect('next_line_progression_sites', 'progression_sites', 'Локализация')}{formData.next_line_progression_sites?.includes('OTHER') && <div className="form-group"><input type="text" name="next_line_progression_sites_other_text" value={formData.next_line_progression_sites_other_text} onChange={handleChange} className="form-input" placeholder="Уточните"/></div>}</>}<div className="form-group"><label className="form-label">Всего линий после алектиниба</label><input type="number" name="total_lines_after_alectinib" value={formData.total_lines_after_alectinib} onChange={handleChange} className="form-input"/></div></div>

      // === ROS1 ===
      case 'diagnosis-ros1': if (!isROS1) return null; return <div className="card"><h3>Диагноз ROS1</h3><div className="grid grid-2"><DateValidation name="initial_diagnosis_date" label="Дата диагноза" value={formData.initial_diagnosis_date} onChange={handleChange} /><TNMSelect name="tnm_stage" label="Стадия TNM" value={formData.tnm_stage} onChange={handleChange} options={dictionaries.tnm_stage} />{renderSelect('histology', 'histology', 'Гистология')}{renderSelect('ros1_fusion_variant', 'ros1_fusion_variant', 'Вариант')}{renderSelect('tp53_comutation', 'yes_no_unknown', 'TP53')}{renderSelect('ttf1_expression', 'yes_no_unknown', 'TTF1')}</div></div>
      case 'pdl1-status': if (!isROS1) return null; return <div className="card"><h3>PD-L1</h3><div className="grid grid-2">{renderSelect('pdl1_status', 'pdl1_status', 'Статус')}{formData.pdl1_status && formData.pdl1_status !== 'UNKNOWN' && formData.pdl1_status !== 'NOT_DONE' && <div className="form-group"><label className="form-label">TPS (%)</label><input type="number" name="pdl1_tps" value={formData.pdl1_tps} onChange={handleChange} className="form-input"/></div>}</div></div>
      
      case 'radical-treatment': if (!isROS1) return null; return (
        <div className="card">
             <h3>Радикальное лечение</h3>
             <div className="form-group">
                <label className="form-label">Проводилось радикальное лечение?</label>
                <div className="radio-group" style={{display: 'flex', gap: '20px', marginTop: '5px'}}>
                    <label className="radio-label" style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}><input type="radio" name="radical_treatment_conducted" value="true" checked={formData.radical_treatment_conducted === true} onChange={handleChange} data-type="bool-radio" style={{marginRight: '8px'}}/>Да</label>
                    <label className="radio-label" style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}><input type="radio" name="radical_treatment_conducted" value="false" checked={formData.radical_treatment_conducted === false} onChange={handleChange} data-type="bool-radio" style={{marginRight: '8px'}}/>Нет</label>
                </div>
             </div>
             {formData.radical_treatment_conducted === true && (
                 <>
                 <div className="subsection">
                    <h4>Тип проведенного лечения</h4>
                    <div className="form-group"><label className="checkbox-label"><input type="checkbox" name="radical_surgery_conducted" checked={formData.radical_surgery_conducted} onChange={handleChange} /><span>Хирургическое лечение</span></label></div>
                    {formData.radical_surgery_conducted && (
                        <div className="grid grid-2">
                            <DateValidation name="radical_surgery_date" label="Дата операции" value={formData.radical_surgery_date} onChange={handleChange} validationRules={dateValidationRules.radical_surgery_date} otherDates={formData} />
                            {renderSelect('radical_surgery_type', 'surgery_types', 'Объем операции')}
                            {formData.radical_surgery_type === 'OTHER' && <div className="form-group"><label className="form-label">Уточните объем</label><input type="text" name="radical_surgery_type_other" value={formData.radical_surgery_type_other} onChange={handleChange} className="form-input"/></div>}
                        </div>
                    )}
                    <div className="form-group" style={{marginTop: 15}}><label className="checkbox-label"><input type="checkbox" name="radical_crt_conducted" checked={formData.radical_crt_conducted} onChange={handleChange} /><span>Химиолучевая терапия (ХЛТ)</span></label></div>
                    {formData.radical_crt_conducted && (
                      <>
                        <div className="grid grid-2"><DateValidation name="radical_crt_start_date" label="Начало ХЛТ" value={formData.radical_crt_start_date} onChange={handleChange} /><DateValidation name="radical_crt_end_date" label="Окончание ХЛТ" value={formData.radical_crt_end_date} onChange={handleChange} validationRules={dateValidationRules.radical_crt_end_date} otherDates={formData} /></div>
                        <div className="form-group"><label className="form-label">Поддерживающая терапия?</label><div className="radio-group"><label><input type="radio" name="radical_crt_consolidation" value="true" checked={formData.radical_crt_consolidation === true} onChange={handleChange} data-type="bool-radio"/> Да</label><label style={{marginLeft:20}}><input type="radio" name="radical_crt_consolidation" value="false" checked={formData.radical_crt_consolidation === false} onChange={handleChange} data-type="bool-radio"/> Нет</label></div></div>
                        {formData.radical_crt_consolidation && <div className="grid grid-2"><div className="form-group"><label className="form-label">Препарат</label><select name="radical_crt_consolidation_drug" value={formData.radical_crt_consolidation_drug || ''} onChange={handleChange} className="form-select"><option value="">Выберите...</option>{(dictionaries.chemo_drugs || []).filter(d => d.parent === 'IMMUNOTHERAPY').map(opt => <option key={opt.code} value={opt.code}>{opt.value_ru}</option>)}</select></div><DateValidation name="radical_crt_consolidation_end_date" label="Дата завершения" value={formData.radical_crt_consolidation_end_date} onChange={handleChange} validationRules={dateValidationRules.radical_crt_consolidation_end_date} otherDates={formData} /></div>}
                      </>
                    )}
                 </div>
                 
                 <div className="subsection">
                     <h4>Периоперационная терапия</h4>
                     {(formData.radical_perioperative_therapy || []).map((t, i) => {
                         // ВАЛИДАЦИЯ ДАТ ВНУТРИ ЛИНИЙ
                         const start = t.start_date;
                         const end = t.end_date;
                         const dateError = start && end && new Date(start) > new Date(end) ? 'Дата окончания раньше начала' : null;

                         return (
                         <div key={i} className="therapy-item">
                             <div className="therapy-header"><h5>Линия {i+1}</h5><button type="button" className="btn-remove" onClick={() => {const newArr = formData.radical_perioperative_therapy.filter((_, idx) => idx !== i); setFormData({...formData, radical_perioperative_therapy: newArr});}}>Удалить</button></div>
                             <div className="form-group"><label className="form-label">Тип</label><select value={t.type} onChange={(e) => {const newArr = [...formData.radical_perioperative_therapy]; newArr[i].type = e.target.value; setFormData({...formData, radical_perioperative_therapy: newArr});}} className="form-select"><option value="">Выбрать</option><option value="NEOADJUVANT">Неоадъювант</option><option value="ADJUVANT">Адъювант</option></select></div>
                             <TherapyBuilder value={t.therapy} dictionaries={dictionaries} onChange={(newTherapy) => {const newArr = [...formData.radical_perioperative_therapy]; newArr[i].therapy = newTherapy; setFormData({...formData, radical_perioperative_therapy: newArr});}} />
                             <div className="grid grid-2">
                                <DateValidation name={`start_${i}`} label="Начало" value={t.start_date} onChange={(e) => {const newArr = [...formData.radical_perioperative_therapy]; newArr[i].start_date = e.target.value; setFormData({...formData, radical_perioperative_therapy: newArr});}}/>
                                <DateValidation name={`end_${i}`} label="Конец" value={t.end_date} onChange={(e) => {const newArr = [...formData.radical_perioperative_therapy]; newArr[i].end_date = e.target.value; setFormData({...formData, radical_perioperative_therapy: newArr});}}/>
                             </div>
                             {dateError && <div style={{color: 'red', fontSize: '12px', marginTop: '-10px', marginBottom: '10px'}}>{dateError}</div>}
                         </div>
                     )})}
                     <button type="button" className="btn btn-secondary" onClick={() => setFormData({...formData, radical_perioperative_therapy: [...formData.radical_perioperative_therapy, {type: '', therapy: {}}]})}>+ Добавить</button>
                 </div>
                 <div className="subsection"><h4>Исход</h4><div className="grid grid-2">{renderSelect('radical_treatment_outcome', 'radical_treatment_outcome', 'Исход')}{formData.radical_treatment_outcome === 'RELAPSE' && <DateValidation name="relapse_date" label="Дата рецидива" value={formData.relapse_date} onChange={handleChange} required validationRules={dateValidationRules.relapse_date} otherDates={formData} />}</div></div>
                 </>
             )}
        </div>
      )
      case 'metastatic-therapy': if (!isROS1) return null; return <div className="card"><h3>Метастатическая фаза</h3><DateValidation name="metastatic_diagnosis_date" label="Дата мтс" value={formData.metastatic_diagnosis_date} onChange={handleChange} validationRules={dateValidationRules.metastatic_diagnosis_date} otherDates={formData} /><TherapyLinesTable value={formData.metastatic_therapy_lines} onChange={(lines) => setFormData({...formData, metastatic_therapy_lines: lines})} dictionaries={dictionaries} /></div>
      default: return null
    }
  }

  if (loading) return <div className="loading">Загрузка...</div>

  const isLastSection = sections.findIndex(s => s.id === currentSection) === sections.length - 1

  return (
    <div className="patient-form-page-new">
        <div className="form-layout">
            <PatientFormSidebar 
                currentSection={currentSection} 
                onSectionChange={setCurrentSection} 
                sections={registryType === 'ALK' ? enrichSections(alkSectionsRaw) : []} 
                structure={registryType === 'ROS1' ? ros1StructureRaw.map(g => ({...g, sections: enrichSections(g.sections)})) : null} 
                formData={formData} 
            />
            <div className="form-content">
                <div className="form-header"><h2>{isEdit ? 'Редактирование' : 'Новый пациент'} ({registryType})</h2><button className="btn btn-secondary" onClick={() => navigate('/patients')}>Закрыть</button></div>
                <div className="patient-info-header">
                    <div className="info-item"><span className="info-label">Код</span><span className="info-value">{formData.patient_code || '-'}</span></div>
                    <div className="info-item"><span className="info-label">Статус</span><span className={`info-value status-${formData.current_status?.toLowerCase()}`}>{dictionaries.current_status?.find(s => s.code === formData.current_status)?.value_ru || formData.current_status || '-'}</span></div>
                    <div className="info-item"><span className="info-label">Стадия</span><span className="info-value">{dictionaries.tnm_stage?.find(s => s.code === formData.tnm_stage)?.value_ru || formData.tnm_stage || '-'}</span></div>
                </div>
                {error && <div className="alert alert-error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    {renderSection()}
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Сохранение...' : (isLastSection ? 'Сохранить и выйти' : 'Сохранить и далее')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  )
}

export default PatientFormPageNew