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
  
  // Состояние видимости критериев
  const [showCriteria, setShowCriteria] = useState(() => {
    const saved = localStorage.getItem('showAlkCriteria')
    return saved !== 'false'
  })

  const toggleCriteria = () => {
    const newState = !showCriteria
    setShowCriteria(newState)
    localStorage.setItem('showAlkCriteria', newState)
  }
  
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
    histology_other: '',
    
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
    previous_therapy_types_other: '',
    previous_therapy_start_date: '',
    previous_therapy_end_date: '',
    previous_therapy_response: '',
    previous_therapy_stop_reason: '',
    previous_therapy_stop_reason_other: '',
    alectinib_start_date: '',
    stage_at_alectinib_start: '',
    ecog_at_start: '',
    metastases_sites: [],
    metastases_sites_other_text: '',
    cns_metastases: false,
    cns_measurable: '',
    cns_symptomatic: '',
    cns_radiotherapy: '',
    alectinib_therapy_status: '', 
    maximum_response: '',
    earliest_response_date: '',
    intracranial_response: '',
    
    // Прогрессирование
    progression_during_alectinib: '',
    local_treatment_at_progression: '',
    progression_sites: [],
    progression_sites_other_text: '',
    progression_date: '',
    continued_after_progression: null,
    
    // Завершение
    alectinib_end_date: '',
    alectinib_stop_reason: '',
    alectinib_stop_reason_other: '',
    had_treatment_interruption: false,
    interruption_reason: '',
    interruption_duration_months: '',
    had_dose_reduction: false,
    
    // После отмены
    has_after_alectinib_progression: null,
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

  const DATE_TOOLTIP_TEXT = "Укажите 15 число месяца, если точная дата неизвестна"

  // Валидация дат
  const dateValidationRules = {
    birth_date: [
      { type: 'after', compareWith: 'initial_diagnosis_date', message: 'Дата рождения не может быть позже даты диагноза' }
    ],
    last_contact_date: [
      { type: 'before', compareWith: 'initial_diagnosis_date', message: 'Дата последнего контакта не может быть раньше даты диагноза' }
    ],
    alk_diagnosis_date: [
      { type: 'before', compareWith: 'initial_diagnosis_date', message: 'Дата диагностики не может быть раньше даты диагноза' }
    ],
    previous_therapy_start_date: [
      { type: 'before', compareWith: 'initial_diagnosis_date', message: 'Дата начала терапии не может быть раньше даты диагноза' }
    ],
    previous_therapy_end_date: [
      { type: 'before', compareWith: 'previous_therapy_start_date', message: 'Дата окончания не может быть раньше даты начала' }
    ],
    alectinib_start_date: [
      { type: 'before', compareWith: 'initial_diagnosis_date', message: 'Лечение не может начаться раньше диагноза' },
      { type: 'before', compareWith: 'previous_therapy_end_date', message: 'Лечение не может начаться раньше окончания предыдущей терапии' }
    ],
    earliest_response_date: [
      { type: 'before', compareWith: 'alectinib_start_date', message: 'Ответ не может быть раньше начала лечения' }
    ],
    progression_date: [
      { type: 'before', compareWith: 'alectinib_start_date', message: 'Прогрессирование не может быть раньше начала лечения' },
      { type: 'before', compareWith: 'earliest_response_date', message: 'Прогрессирование не может быть раньше ответа' }
    ],
    alectinib_end_date: [
      { type: 'before', compareWith: 'alectinib_start_date', message: 'Окончание не может быть раньше начала' }
    ],
    after_alectinib_progression_date: [
      { type: 'before', compareWith: 'alectinib_end_date', message: 'Прогрессирование должно быть позже отмены' }
    ],
    next_line_start_date: [
      { type: 'before', compareWith: 'alectinib_end_date', message: 'Следующая линия не может начаться раньше окончания алектиниба' }
    ],
    next_line_end_date: [
      { type: 'before', compareWith: 'next_line_start_date', message: 'Окончание не может быть раньше даты начала' }
    ],
    radical_surgery_date: [
      { type: 'before', compareWith: 'initial_diagnosis_date', message: 'Операция не может быть раньше диагноза' }
    ],
    radical_crt_end_date: [
      { type: 'before', compareWith: 'radical_crt_start_date', message: 'Окончание не может быть раньше начала' }
    ],
    radical_crt_consolidation_end_date: [
      { type: 'before', compareWith: 'radical_crt_end_date', message: 'Поддерживающая терапия не может заканчиваться раньше окончания ХЛТ' }
    ],
    relapse_date: [
      { type: 'before', compareWith: 'initial_diagnosis_date', message: 'Рецидив не может быть раньше диагноза' }
    ],
    metastatic_diagnosis_date: [
      { type: 'before', compareWith: 'initial_diagnosis_date', message: 'МТС стадия не может быть раньше диагноза' }
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
        if (cr.after_alectinib_progression_type || cr.after_alectinib_progression_date) {
            cr.has_after_alectinib_progression = true
        } else {
            cr.has_after_alectinib_progression = false
        }
        setFormData(cr)
      }
    } catch { setError('Ошибка загрузки данных') } 
    finally { setLoading(false) }
  }

  const alkSectionsRaw = [
    { id: 'current-status', title: 'Витальный статус', icon: 'I' },
    { id: 'patient-basic', title: 'Демография и антропометрия', icon: 'II' },
    { id: 'diagnosis-alk', title: 'Диагноз и молекулярный профиль', icon: 'III' },
    { id: 'previous-therapy', title: 'Предшествующая терапия', icon: 'IV' },
    { id: 'alectinib-complete', title: 'Терапия препаратом алектиниб', icon: 'V' },
    { id: 'next-line', title: 'Последующие линии лечения', icon: 'VI' }
  ]

  const ros1SectionsRaw = [
    { id: 'current-status', title: 'Витальный статус', icon: 'I' },
    { id: 'patient-basic', title: 'Демография и антропометрия', icon: 'II' },
    { id: 'diagnosis-ros1', title: 'Диагностика и биомаркеры', icon: 'III' },
    { id: 'radical-treatment', title: 'Радикальное лечение', icon: 'IV' },
    { id: 'metastatic-therapy', title: 'Лекарственная терапия метастатической стадии', icon: 'V' }
  ]

  const sections = registryType === 'ROS1' ? ros1SectionsRaw : alkSectionsRaw

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    let val = value
    if (type === 'checkbox') val = checked
    
    if (e.target.getAttribute && e.target.getAttribute('data-type') === 'bool-radio') {
        val = value === 'true'
    }

    setFormData(prev => {
        const updated = { ...prev, [name]: val }
        
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

        if (name === 'cns_metastases' && val === false) {
            updated.cns_measurable = ''
            updated.cns_symptomatic = ''
            updated.cns_radiotherapy = ''
            updated.intracranial_response = ''
        }

        return updated
    })
  }

  const handleMultiSelect = (name, value) => {
    setFormData(prev => {
      const current = prev[name] || []
      const newValues = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
      const updated = { ...prev, [name]: newValues }
      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
        const preparedData = { ...formData }
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
    } catch (err) { console.error(err); setError('Ошибка при сохранении данных') } 
    finally { setSaving(false) }
  }

  const renderSelect = (name, category, label, required=false) => (
    <div className="form-group">
      <label className="form-label">{label}{required && <span className="required">*</span>}</label>
      <select name={name} value={formData[name] || ''} onChange={handleChange} className="form-select" required={required}>
        <option value="">Выберите значение...</option>
        {(dictionaries[category] || []).map(opt => <option key={opt.code} value={opt.code}>{opt.value_ru}</option>)}
      </select>
    </div>
  )

  const renderMultiSelect = (name, category, label, required=false) => {
    let options = dictionaries[category] || []
    const selected = formData[name] || []
    if (name === 'metastases_sites') options = options.filter(opt => opt.code !== 'CNS')
    return (
      <div className="form-group">
        <label className="form-label">{label}{required && <span className="required">*</span>}</label>
        <div className="checkbox-group">
          {options.map(opt => (
            <label key={opt.code} className="checkbox-label">
              <input type="checkbox" checked={selected.includes(opt.code)} onChange={() => handleMultiSelect(name, opt.code)} />
              <span>{opt.value_ru}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  const renderSection = () => {
    const isROS1 = registryType === 'ROS1'
    const isALK = registryType === 'ALK'

    switch(currentSection) {
      case 'current-status': 
        return (
          <div className="card">
            <h3>Витальный статус пациента</h3>
            <div className="grid grid-2">
              {renderSelect('current_status', 'current_status', 'Текущий статус', true)}
              <div className="form-group">
                <label className="form-label">
                  {formData.current_status === 'DEAD' ? 'Дата смерти' : 'Дата последнего контакта'}
                </label>
                <DateValidation 
                  name="last_contact_date" 
                  label="" 
                  value={formData.last_contact_date} 
                  onChange={handleChange} 
                  validationRules={dateValidationRules.last_contact_date} 
                  otherDates={formData} 
                  tooltip={DATE_TOOLTIP_TEXT}
                />
              </div>
            </div>
          </div>
        )

      case 'patient-basic': 
        return (
          <>
            <div className="card">
              <h3>Идентификация и дата регистрации</h3>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Код пациента (ID) <span className="required">*</span></label>
                  <input type="text" name="patient_code" value={formData.patient_code} onChange={handleChange} className="form-input" placeholder="Введите уникальный идентификатор" required />
                </div>
                {/* Подсказка убрана по требованию */}
                <DateValidation name="date_filled" label="Дата заполнения карты" value={formData.date_filled} onChange={handleChange} required />
              </div>
            </div>

            <div className="card">
              <h3>Демографические и антропометрические данные</h3>
              <div className="grid grid-2">
                <div className="form-group"><label className="form-label">Пол <span className="required">*</span></label><select name="gender" value={formData.gender} onChange={handleChange} className="form-select" required><option value="">Выберите...</option><option value="м">Мужской</option><option value="ж">Женский</option></select></div>
                
                <div className="form-group">
                  <label className="form-label">Дата рождения <span className="required">*</span></label>
                  <DateValidation name="birth_date" label="" value={formData.birth_date} onChange={handleChange} validationRules={dateValidationRules.birth_date} otherDates={formData} required tooltip={DATE_TOOLTIP_TEXT} />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Рост (см) <span className="required">*</span></label>
                  <input type="number" name="height" value={formData.height} onChange={handleChange} className="form-input" min="30" max="250" placeholder="см" required />
                </div>

                <div className="form-group">
                  <label className="form-label">Вес на момент начала терапии алектинибом (кг) <span className="required">*</span></label>
                  <input type="number" name="weight" value={formData.weight} onChange={handleChange} className="form-input" min="10" max="300" placeholder="кг" required />
                </div>
              </div>
              {renderMultiSelect('comorbidities', 'comorbidities', 'Сопутствующая патология')}
              {formData.comorbidities?.includes('OTHER') && <div className="form-group"><label className="form-label">Уточните иное</label><input type="text" name="comorbidities_other_text" value={formData.comorbidities_other_text} onChange={handleChange} className="form-input"/></div>}
              {renderSelect('smoking_status', 'smoking_status', 'Статус курения', true)}
            </div>
          </>
        )
      
      // ALK
      case 'diagnosis-alk': 
        if (!isALK) return null; 
        return (
          <>
            <div className="card">
              <h3>Характеристика опухолевого процесса</h3>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Дата установления первичного диагноза <span className="required">*</span></label>
                  <DateValidation name="initial_diagnosis_date" label="" value={formData.initial_diagnosis_date} onChange={handleChange} required tooltip={DATE_TOOLTIP_TEXT} />
                </div>
                
                <TNMSelect name="tnm_stage" label="Стадия по классификации TNM (8-я ред.)" value={formData.tnm_stage} onChange={handleChange} options={dictionaries.tnm_stage} required />
                
                <div className="form-group">
                  <label className="form-label">Дата установления метастатической стадии <span className="form-help">(заполняется при отличии от даты первичного диагноза)</span></label>
                  <DateValidation name="metastatic_disease_date" label="" value={formData.metastatic_disease_date} onChange={handleChange} tooltip={DATE_TOOLTIP_TEXT} />
                </div>
                {renderSelect('histology', 'histology', 'Гистологический тип', true)}
                {formData.histology === 'OTHER' && (
                  <div className="form-group"><label className="form-label">Уточните гистологический тип</label><input type="text" name="histology_other" value={formData.histology_other} onChange={handleChange} className="form-input" /></div>
                )}
              </div>
            </div>
            <div className="card">
              <h3>Молекулярно-генетическая диагностика (ALK)</h3>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Дата подтверждения транслокации ALK <span className="required">*</span></label>
                  <DateValidation name="alk_diagnosis_date" label="" value={formData.alk_diagnosis_date} onChange={handleChange} validationRules={dateValidationRules.alk_diagnosis_date} otherDates={formData} required tooltip={DATE_TOOLTIP_TEXT} />
                </div>
                {renderSelect('alk_fusion_variant', 'alk_fusion_variant', 'Вариант транслокации ALK', true)}
                {renderSelect('tp53_comutation', 'yes_no_unknown', 'Статус ко-мутации TP53', true)}
                {renderSelect('ttf1_expression', 'yes_no_unknown', 'Экспрессия TTF-1', true)}
              </div>
              {renderMultiSelect('alk_methods', 'alk_methods', 'Метод детекции', true)}
            </div>
          </>
        )
      
      case 'previous-therapy': 
        return (
          <div className="card">
            <h3>Предшествующая системная (лекарственная) терапия до назначения алектиниба</h3>
            
            <div className="form-group">
              <label className="form-label" style={{marginBottom: '10px'}}>Наличие предшествующей терапии (в т.ч. нео-/адъювантной)</label>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <label className="radio-label" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="previous_therapy_status" 
                    checked={formData.no_previous_therapy === true} 
                    onChange={() => setFormData(prev => ({ 
                      ...prev, 
                      no_previous_therapy: true, 
                      had_previous_therapy: false,
                      previous_therapy_types: [],
                      previous_therapy_start_date: null,
                      previous_therapy_end_date: null,
                      previous_therapy_response: '',
                      previous_therapy_stop_reason: ''
                    }))} 
                    style={{ marginRight: '8px', width: '18px', height: '18px' }}
                  />
                  <span>Предшествующая терапия отсутствовала</span>
                </label>
                
                <label className="radio-label" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="previous_therapy_status" 
                    checked={formData.had_previous_therapy === true} 
                    onChange={() => setFormData(prev => ({ 
                      ...prev, 
                      no_previous_therapy: false, 
                      had_previous_therapy: true 
                    }))} 
                    style={{ marginRight: '8px', width: '18px', height: '18px' }}
                  />
                  <span>Предшествующая терапия проводилась</span>
                </label>
              </div>
            </div>

            {formData.had_previous_therapy && (
              <div className="animation-fade-in">
                <div className="form-group">
                  <label className="form-label">Вид проведенного лечения <span className="required">*</span></label>
                  <select 
                    value={formData.previous_therapy_types?.[0] || ''} 
                    onChange={(e) => setFormData(p => ({ ...p, previous_therapy_types: [e.target.value] }))} 
                    className="form-select"
                    required
                  >
                    <option value="">Выберите...</option>
                    {(dictionaries.previous_therapy_types || []).map(opt => (
                      <option key={opt.code} value={opt.code}>{opt.value_ru}</option>
                    ))}
                  </select>
                </div>
                {formData.previous_therapy_types?.includes('OTHER') && (
                  <div className="form-group"><label className="form-label">Уточните вид терапии</label><input type="text" name="previous_therapy_types_other" value={formData.previous_therapy_types_other} onChange={handleChange} className="form-input" /></div>
                )}
                
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Дата начала <span className="required">*</span></label>
                    <DateValidation name="previous_therapy_start_date" label="" value={formData.previous_therapy_start_date} onChange={handleChange} required tooltip={DATE_TOOLTIP_TEXT} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Дата завершения <span className="required">*</span></label>
                    <DateValidation name="previous_therapy_end_date" label="" value={formData.previous_therapy_end_date} onChange={handleChange} validationRules={dateValidationRules.previous_therapy_end_date} otherDates={formData} required tooltip={DATE_TOOLTIP_TEXT} />
                  </div>
                  {renderSelect('previous_therapy_response', 'response', 'Лучший достигнутый ответ', true)}
                  {renderSelect('previous_therapy_stop_reason', 'previous_therapy_stop_reason', 'Причина отмены', true)}
                </div>
                {formData.previous_therapy_stop_reason === 'OTHER' && (
                  <div className="form-group"><label className="form-label">Уточните причину</label><input type="text" name="previous_therapy_stop_reason_other" value={formData.previous_therapy_stop_reason_other} onChange={handleChange} className="form-input" /></div>
                )}
              </div>
            )}
          </div>
        )

      case 'alectinib-complete': 
        return (
          <>
            <div className="card">
              <h3>Параметры терапии препаратом алектиниб</h3>
              <div className="grid grid-2">
                {renderSelect('alectinib_therapy_status', 'alectinib_therapy_status', 'Статус терапии', true)}
                <div className="form-group">
                  <label className="form-label">Дата инициации терапии <span className="required">*</span></label>
                  <DateValidation name="alectinib_start_date" label="" value={formData.alectinib_start_date} onChange={handleChange} validationRules={dateValidationRules.alectinib_start_date} otherDates={formData} required tooltip={DATE_TOOLTIP_TEXT} />
                </div>
                {renderSelect('stage_at_alectinib_start', 'stage_at_alectinib_start', 'Стадия заболевания на момент начала терапии алектинибом', true)}
                <div className="form-group"><label className="form-label">Статус ECOG (0-4) на момент начала терапии алектинибом <span className="required">*</span></label><input type="number" name="ecog_at_start" value={formData.ecog_at_start} onChange={handleChange} className="form-input" min="0" max="4" required/></div>
              </div>
              {renderMultiSelect('metastases_sites', 'metastases_sites', 'Локализация метастазов на момент начала терапии алектинибом', true)}
              {formData.metastases_sites?.includes('OTHER') && <div className="form-group"><input type="text" name="metastases_sites_other_text" value={formData.metastases_sites_other_text} onChange={handleChange} className="form-input" placeholder="Уточните локализацию"/></div>}
              <div className="form-group"><label className="checkbox-label"><input type="checkbox" name="cns_metastases" checked={formData.cns_metastases} onChange={handleChange}/><span>Наличие метастазов в ЦНС</span></label></div>
              {formData.cns_metastases && (
                <>
                  <div className="grid grid-3">
                    {renderSelect('cns_measurable', 'cns_measurable', 'Характеристика очагов')}
                    {renderSelect('cns_symptomatic', 'cns_symptomatic', 'Клинические проявления')}
                    {renderSelect('cns_radiotherapy', 'cns_radiotherapy', 'Лучевая терапия на ЦНС')}
                  </div>
                </>
              )}
            </div>

            <div className="card">
              <h3>Оценка эффективности терапии</h3>
              <div className="grid grid-2">
                {renderSelect('maximum_response', 'response', 'Лучший общий ответ', true)}
                <div className="form-group">
                  <label className="form-label">Дата регистрации ответа</label>
                  <DateValidation name="maximum_response_date" label="" value={formData.earliest_response_date} onChange={handleChange} tooltip={DATE_TOOLTIP_TEXT} />
                </div>
                {formData.cns_metastases && renderSelect('intracranial_response', 'intracranial_response', 'Интракраниальный ответ')}
              </div>
            </div>

            <div className="card">
              <h3>Прогрессирование заболевания на фоне терапии</h3>
              <div className="grid grid-2">
                {renderSelect('progression_during_alectinib', 'progression_type', 'Тип прогрессирования', true)}
                {formData.progression_during_alectinib && formData.progression_during_alectinib !== 'NONE' && (
                  <>
                    {renderSelect('local_treatment_at_progression', 'local_treatment_at_progression', 'Локальный контроль при прогрессировании')}
                    <div className="form-group">
                      <label className="form-label">Дата регистрации прогрессирования</label>
                      <DateValidation name="progression_date" label="" value={formData.progression_date} onChange={handleChange} validationRules={dateValidationRules.progression_date} otherDates={formData} tooltip={DATE_TOOLTIP_TEXT} />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Продолжение терапии алектинибом после прогрессирования?</label>
                      <div className="radio-group" style={{display: 'flex', gap: '20px'}}>
                        <label className="radio-label" style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                          <input type="radio" name="continued_after_progression" value="true" checked={formData.continued_after_progression === true} onChange={handleChange} data-type="bool-radio" style={{marginRight: '8px'}}/>Да
                        </label>
                        <label className="radio-label" style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                          <input type="radio" name="continued_after_progression" value="false" checked={formData.continued_after_progression === false} onChange={handleChange} data-type="bool-radio" style={{marginRight: '8px'}}/>Нет
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>
              {formData.progression_during_alectinib && formData.progression_during_alectinib !== 'NONE' && (
                <>
                  {renderMultiSelect('progression_sites', 'progression_sites', 'Локализация прогрессирования')}
                  {formData.progression_sites?.includes('OTHER') && (
                    <div className="form-group">
                      <label className="form-label">Иная локализация (уточните)</label>
                      <input type="text" name="progression_sites_other_text" value={formData.progression_sites_other_text} onChange={handleChange} className="form-input" placeholder="Уточните"/>
                    </div>
                  )}
                </>
              )}
            </div>

            {formData.alectinib_therapy_status === 'STOPPED' && (
              <div className="card">
                  <h3>Завершение терапии</h3>
                  <div className="grid grid-2">
                      <div className="form-group">
                        <label className="form-label">Дата отмены препарата</label>
                        <DateValidation name="alectinib_end_date" label="" value={formData.alectinib_end_date} onChange={handleChange} validationRules={dateValidationRules.alectinib_end_date} otherDates={formData} tooltip={DATE_TOOLTIP_TEXT} />
                      </div>
                      {renderSelect('alectinib_stop_reason', 'alectinib_stop_reason', 'Причина отмены')}
                  </div>
                  
                  {formData.alectinib_stop_reason === 'OTHER' && (
                    <div className="form-group">
                      <label className="form-label">Укажите иную причину</label>
                      <input 
                        type="text" 
                        name="alectinib_stop_reason_other" 
                        value={formData.alectinib_stop_reason_other} 
                        onChange={handleChange} 
                        className="form-input" 
                      />
                    </div>
                  )}
                  
                  <div className="form-group" style={{marginTop: '15px'}}>
                      <label className="form-label">Зафиксировано ли прогрессирование после отмены терапии?</label>
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
                          <h4>Характеристика прогрессирования</h4>
                          <div className="grid grid-2">
                              <div className="form-group">
                                <label className="form-label">Дата регистрации</label>
                                <DateValidation name="after_alectinib_progression_date" label="" value={formData.after_alectinib_progression_date} onChange={handleChange} validationRules={dateValidationRules.after_alectinib_progression_date} otherDates={formData} tooltip={DATE_TOOLTIP_TEXT} />
                              </div>
                              {renderSelect('after_alectinib_progression_type', 'progression_type', 'Тип прогрессирования')}
                          </div>
                          {renderMultiSelect('after_alectinib_progression_sites', 'progression_sites', 'Локализация')}
                          {formData.after_alectinib_progression_sites?.includes('OTHER') && (
                              <div className="form-group"><input type="text" name="after_alectinib_progression_sites_other_text" value={formData.after_alectinib_progression_sites_other_text} onChange={handleChange} className="form-input" placeholder="Уточните"/></div>
                          )}
                      </div>
                  )}

                  <div className="form-group" style={{marginTop: 20}}>
                    <label className="checkbox-label">
                      <input type="checkbox" name="had_treatment_interruption" checked={formData.had_treatment_interruption} onChange={handleChange}/>
                      <span>Наличие перерывов в лечении</span>
                    </label>
                  </div>
                  {formData.had_treatment_interruption && (
                    <div className="grid grid-2">
                      {renderSelect('interruption_reason', 'interruption_reason', 'Причина перерыва')}
                      <div className="form-group">
                        <label className="form-label">Длительность перерыва (мес.)</label>
                        <input type="number" name="interruption_duration_months" value={formData.interruption_duration_months} onChange={handleChange} className="form-input" step="0.1"/>
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input type="checkbox" name="had_dose_reduction" checked={formData.had_dose_reduction} onChange={handleChange}/>
                      <span>Редукция дозы вследствие нежелательных явлений</span>
                    </label>
                  </div>
              </div>
            )}
          </>
        )

      case 'next-line': 
        if (formData.alectinib_therapy_status !== 'STOPPED') return <div className="card"><h3>Последующая терапия</h3><p>Раздел доступен только при завершенной терапии алектинибом</p></div>; 
        return (
          <div className="card">
            <h3>Характеристика последующей линии терапии</h3>
            {renderMultiSelect('next_line_treatments', 'next_line_treatments', 'Назначенное лечение')}
            {formData.next_line_treatments?.includes('OTHER') && <div className="form-group"><input type="text" name="next_line_treatments_other_text" value={formData.next_line_treatments_other_text} onChange={handleChange} className="form-input" placeholder="Уточните препарат/схему"/></div>}
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Дата начала линии</label>
                <DateValidation name="next_line_start_date" label="" value={formData.next_line_start_date} onChange={handleChange} validationRules={dateValidationRules.next_line_start_date} otherDates={formData} tooltip={DATE_TOOLTIP_TEXT} />
              </div>
              <div className="form-group">
                <label className="form-label">Дата завершения линии</label>
                <DateValidation name="next_line_end_date" label="" value={formData.next_line_end_date} onChange={handleChange} validationRules={dateValidationRules.next_line_end_date} otherDates={formData} tooltip={DATE_TOOLTIP_TEXT} />
              </div>
              <div className="form-group"><label className="checkbox-label"><input type="checkbox" name="progression_on_next_line" checked={formData.progression_on_next_line} onChange={handleChange}/><span>Зафиксировано прогрессирование на данной линии</span></label></div>
            </div>
            {formData.progression_on_next_line && (
              <>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Дата прогрессирования</label>
                    <DateValidation name="progression_on_next_line_date" label="" value={formData.progression_on_next_line_date} onChange={handleChange} tooltip={DATE_TOOLTIP_TEXT} />
                  </div>
                  {renderSelect('next_line_progression_type', 'progression_type', 'Тип прогрессирования')}
                </div>
                {renderMultiSelect('next_line_progression_sites', 'progression_sites', 'Локализация прогрессирования')}
                {formData.next_line_progression_sites?.includes('OTHER') && <div className="form-group"><label className="form-label">Уточните локализацию</label><input type="text" name="next_line_progression_sites_other_text" value={formData.next_line_progression_sites_other_text} onChange={handleChange} className="form-input" placeholder="Уточните"/></div>}
              </>
            )}
            <div className="form-group"><label className="form-label">Общее количество линий терапии после алектиниба</label><input type="number" name="total_lines_after_alectinib" value={formData.total_lines_after_alectinib} onChange={handleChange} className="form-input"/></div>
          </div>
        )

      // === ROS1 (Flattened & PD-L1 moved) ===
      case 'diagnosis-ros1': 
        if (!isROS1) return null; 
        return (
          <div className="card">
            <h3>Диагноз и молекулярный профиль (ROS1)</h3>
            <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Дата установления диагноза</label>
                  <DateValidation name="initial_diagnosis_date" label="" value={formData.initial_diagnosis_date} onChange={handleChange} tooltip={DATE_TOOLTIP_TEXT} />
                </div>
                <TNMSelect name="tnm_stage" label="Стадия TNM" value={formData.tnm_stage} onChange={handleChange} options={dictionaries.tnm_stage} />
                {renderSelect('histology', 'histology', 'Гистологический тип')}
                {renderSelect('ros1_fusion_variant', 'ros1_fusion_variant', 'Вариант транслокации ROS1')}
                {renderSelect('tp53_comutation', 'yes_no_unknown', 'Статус TP53')}
                {renderSelect('ttf1_expression', 'yes_no_unknown', 'Статус TTF1')}
                
                {renderSelect('pdl1_status', 'pdl1_status', 'Статус экспрессии PD-L1')}
                {formData.pdl1_status && formData.pdl1_status !== 'UNKNOWN' && formData.pdl1_status !== 'NOT_DONE' && (
                    <div className="form-group">
                        <label className="form-label">Уровень TPS (%)</label>
                        <input type="number" name="pdl1_tps" value={formData.pdl1_tps} onChange={handleChange} className="form-input" min="0" max="100"/>
                    </div>
                )}
            </div>
          </div>
        )
      
      case 'radical-treatment': if (!isROS1) return null; return (
        <div className="card">
             <h3>Радикальное лечение</h3>
             <div className="form-group">
                <label className="form-label">Факт проведения радикального лечения</label>
                <div className="radio-group" style={{display: 'flex', gap: '20px', marginTop: '5px'}}>
                    <label className="radio-label" style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}><input type="radio" name="radical_treatment_conducted" value="true" checked={formData.radical_treatment_conducted === true} onChange={handleChange} data-type="bool-radio" style={{marginRight: '8px'}}/>Да</label>
                    <label className="radio-label" style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}><input type="radio" name="radical_treatment_conducted" value="false" checked={formData.radical_treatment_conducted === false} onChange={handleChange} data-type="bool-radio" style={{marginRight: '8px'}}/>Нет</label>
                </div>
             </div>
             {formData.radical_treatment_conducted === true && (
                 <>
                 <div className="subsection">
                    <h4>Характер проведенного лечения</h4>
                    <div className="form-group"><label className="checkbox-label"><input type="checkbox" name="radical_surgery_conducted" checked={formData.radical_surgery_conducted} onChange={handleChange} /><span>Хирургическое вмешательство</span></label></div>
                    {formData.radical_surgery_conducted && (
                        <div className="grid grid-2">
                            <div className="form-group">
                              <label className="form-label">Дата операции</label>
                              <DateValidation name="radical_surgery_date" label="" value={formData.radical_surgery_date} onChange={handleChange} validationRules={dateValidationRules.radical_surgery_date} otherDates={formData} tooltip={DATE_TOOLTIP_TEXT} />
                            </div>
                            {renderSelect('radical_surgery_type', 'surgery_types', 'Объем операции')}
                            {formData.radical_surgery_type === 'OTHER' && <div className="form-group"><label className="form-label">Уточните объем</label><input type="text" name="radical_surgery_type_other" value={formData.radical_surgery_type_other} onChange={handleChange} className="form-input"/></div>}
                        </div>
                    )}
                    <div className="form-group" style={{marginTop: 15}}><label className="checkbox-label"><input type="checkbox" name="radical_crt_conducted" checked={formData.radical_crt_conducted} onChange={handleChange} /><span>Химиолучевая терапия (ХЛТ)</span></label></div>
                    {formData.radical_crt_conducted && (
                      <>
                        <div className="grid grid-2">
                          <div className="form-group">
                            <label className="form-label">Начало ХЛТ</label>
                            <DateValidation name="radical_crt_start_date" label="" value={formData.radical_crt_start_date} onChange={handleChange} tooltip={DATE_TOOLTIP_TEXT} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Окончание ХЛТ</label>
                            <DateValidation name="radical_crt_end_date" label="" value={formData.radical_crt_end_date} onChange={handleChange} validationRules={dateValidationRules.radical_crt_end_date} otherDates={formData} tooltip={DATE_TOOLTIP_TEXT} />
                          </div>
                        </div>
                        <div className="form-group"><label className="form-label">Проведение поддерживающей терапии</label><div className="radio-group"><label><input type="radio" name="radical_crt_consolidation" value="true" checked={formData.radical_crt_consolidation === true} onChange={handleChange} data-type="bool-radio"/> Да</label><label style={{marginLeft:20}}><input type="radio" name="radical_crt_consolidation" value="false" checked={formData.radical_crt_consolidation === false} onChange={handleChange} data-type="bool-radio"/> Нет</label></div></div>
                        {formData.radical_crt_consolidation && <div className="grid grid-2"><div className="form-group"><label className="form-label">Препарат</label><select name="radical_crt_consolidation_drug" value={formData.radical_crt_consolidation_drug || ''} onChange={handleChange} className="form-select"><option value="">Выберите...</option>{(dictionaries.chemo_drugs || []).filter(d => d.parent === 'IMMUNOTHERAPY').map(opt => <option key={opt.code} value={opt.code}>{opt.value_ru}</option>)}</select></div><div className="form-group"><label className="form-label">Дата завершения</label><DateValidation name="radical_crt_consolidation_end_date" label="" value={formData.radical_crt_consolidation_end_date} onChange={handleChange} validationRules={dateValidationRules.radical_crt_consolidation_end_date} otherDates={formData} tooltip={DATE_TOOLTIP_TEXT} /></div></div>}
                      </>
                    )}
                 </div>
                 
                 <div className="subsection">
                     <h4>Периоперационная лекарственная терапия</h4>
                     {(formData.radical_perioperative_therapy || []).map((t, i) => {
                         const start = t.start_date;
                         const end = t.end_date;
                         const dateError = start && end && new Date(start) > new Date(end) ? 'Дата окончания раньше начала' : null;

                         return (
                         <div key={i} className="therapy-item">
                             <div className="therapy-header"><h5>Линия {i+1}</h5><button type="button" className="btn-remove" onClick={() => {const newArr = formData.radical_perioperative_therapy.filter((_, idx) => idx !== i); setFormData({...formData, radical_perioperative_therapy: newArr});}}>Удалить</button></div>
                             <div className="form-group"><label className="form-label">Тип</label><select value={t.type} onChange={(e) => {const newArr = [...formData.radical_perioperative_therapy]; newArr[i].type = e.target.value; setFormData({...formData, radical_perioperative_therapy: newArr});}} className="form-select"><option value="">Выбрать</option><option value="NEOADJUVANT">Неоадъювант</option><option value="ADJUVANT">Адъювант</option></select></div>
                             <TherapyBuilder value={t.therapy} dictionaries={dictionaries} onChange={(newTherapy) => {const newArr = [...formData.radical_perioperative_therapy]; newArr[i].therapy = newTherapy; setFormData({...formData, radical_perioperative_therapy: newArr});}} />
                             <div className="grid grid-2">
                                <div className="form-group"><label className="form-label">Начало</label><DateValidation name={`start_${i}`} label="" value={t.start_date} onChange={(e) => {const newArr = [...formData.radical_perioperative_therapy]; newArr[i].start_date = e.target.value; setFormData({...formData, radical_perioperative_therapy: newArr});}} tooltip={DATE_TOOLTIP_TEXT}/></div>
                                <div className="form-group"><label className="form-label">Конец</label><DateValidation name={`end_${i}`} label="" value={t.end_date} onChange={(e) => {const newArr = [...formData.radical_perioperative_therapy]; newArr[i].end_date = e.target.value; setFormData({...formData, radical_perioperative_therapy: newArr});}} tooltip={DATE_TOOLTIP_TEXT}/></div>
                             </div>
                             {dateError && <div style={{color: 'red', fontSize: '12px', marginTop: '-10px', marginBottom: '10px'}}>{dateError}</div>}
                         </div>
                     )})}
                     <button type="button" className="btn btn-secondary" onClick={() => setFormData({...formData, radical_perioperative_therapy: [...formData.radical_perioperative_therapy, {type: '', therapy: {}}]})}>+ Добавить этап терапии</button>
                 </div>
                 <div className="subsection"><h4>Результат лечения</h4><div className="grid grid-2">{renderSelect('radical_treatment_outcome', 'radical_treatment_outcome', 'Исход')}{formData.radical_treatment_outcome === 'RELAPSE' && 
                 <div className="form-group">
                   <label className="form-label">Дата рецидива</label>
                   <DateValidation name="relapse_date" label="" value={formData.relapse_date} onChange={handleChange} required validationRules={dateValidationRules.relapse_date} otherDates={formData} tooltip={DATE_TOOLTIP_TEXT} />
                 </div>}</div></div>
                 </>
             )}
        </div>
      )
      case 'metastatic-therapy': if (!isROS1) return null; return (
        <div className="card">
          <h3>Метастатическая стадия</h3>
          <div className="form-group">
            <label className="form-label">Дата установления мтс стадии <span className="form-help"> {DATE_TOOLTIP_TEXT}</span></label>
            <DateValidation name="metastatic_diagnosis_date" label="" value={formData.metastatic_diagnosis_date} onChange={handleChange} validationRules={dateValidationRules.metastatic_diagnosis_date} otherDates={formData} />
          </div>
          <TherapyLinesTable value={formData.metastatic_therapy_lines} onChange={(lines) => setFormData({...formData, metastatic_therapy_lines: lines})} dictionaries={dictionaries} />
        </div>
      )
      default: return null
    }
  }

  if (loading) return <div className="loading">Загрузка данных...</div>

  const isLastSection = sections.findIndex(s => s.id === currentSection) === sections.length - 1

  return (
    <div className="patient-form-page-new">
        <div className="form-layout">
            <PatientFormSidebar 
                currentSection={currentSection} 
                onSectionChange={setCurrentSection} 
                sections={sections} 
                formData={formData} 
            />
            <div className="form-content">
                <div className="form-header-container" style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div className="header-top-row" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: registryType === 'ALK' ? '20px' : '0' }}>
                        <button className="btn btn-secondary" onClick={() => navigate('/patients')}>К списку пациентов</button>
                        <h2 style={{ margin: 0, fontSize: '24px' }}>{isEdit ? 'Редактирование записи' : 'Новая запись'} ({registryType})</h2>
                        {isEdit && <span style={{marginLeft: 'auto', fontSize: '13px', color: '#16a34a'}}>Автоматическое сохранение активно</span>}
                    </div>
                    
                    {registryType === 'ALK' && (
                        <div className="registry-info-block" style={{ fontSize: '14px', lineHeight: '1.5', color: '#374151', borderTop: '1px solid #e5e7eb', paddingTop: '15px', marginTop: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showCriteria ? '10px' : '0' }}>
                                <span style={{ fontWeight: 500, color: '#6b7280' }}>Справочные данные</span>
                                <button 
                                    type="button" 
                                    onClick={toggleCriteria}
                                    style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        color: '#2563eb', 
                                        cursor: 'pointer', 
                                        fontSize: '13px', 
                                        padding: '0'
                                    }}
                                >
                                    {showCriteria ? 'Скрыть критерии ▲' : 'Показать критерии включения/исключения ▼'}
                                </button>
                            </div>
                            
                            {showCriteria && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <strong style={{ color: '#166534', display: 'block', marginBottom: '8px' }}>Критерии включения:</strong>
                                        <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc' }}>
                                            <li>Гистологически подтвержденный немелкоклеточный рак легкого (НМРЛ)</li>
                                            <li>Местнораспространенный (III стадия) или метастатический (IV стадия) процесс</li>
                                            <li>Документально подтвержденная транслокация ALK</li>
                                            <li>Терапия алектинибом в первой линии таргетной терапии</li>
                                            <li>Инициация терапии в период 07.2021 по 12.2022 гг.</li>
                                            <li>Наличие хотя бы одного контрольного обследования с оценкой эффективности во время терапии алектинибом</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <strong style={{ color: '#dc2626', display: 'block', marginBottom: '8px' }}>Критерии исключения:</strong>
                                        <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc' }}>
                                            <li>Отсутствие верифицированного статуса ALK</li>
                                            <li>Предшествующая терапия иными ингибиторами ALK</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="patient-info-header">
                    <div className="info-item"><span className="info-label">ID Пациента</span><span className="info-value">{formData.patient_code || '-'}</span></div>
                    <div className="info-item"><span className="info-label">Статус</span><span className={`info-value status-${formData.current_status?.toLowerCase()}`}>{dictionaries.current_status?.find(s => s.code === formData.current_status)?.value_ru || formData.current_status || '-'}</span></div>
                    <div className="info-item"><span className="info-label">Стадия</span><span className="info-value">{dictionaries.tnm_stage?.find(s => s.code === formData.tnm_stage)?.value_ru || formData.tnm_stage || '-'}</span></div>
                </div>
                {error && <div className="alert alert-error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    {renderSection()}
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Сохранение...' : (isLastSection ? 'Сохранить и завершить' : 'Сохранить и перейти к следующему разделу')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  )
}

export default PatientFormPageNew