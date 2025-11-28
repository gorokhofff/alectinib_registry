import React, { useState, useEffect, useCallback } from 'react'
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
  const [autoSaveTimer, setAutoSaveTimer] = useState(null)
  
  // Form sections definition - разные для ALK и ROS1
  const alkSections = [
    { id: 'current-status', title: 'Текущий статус', icon: '📊' },
    { id: 'patient-basic', title: 'Код пациента и базовые данные', icon: '👤' },
    { id: 'diagnosis-alk', title: 'Диагноз и ALK диагностика', icon: '🔍' },
    { id: 'previous-therapy', title: 'Предыдущая терапия', icon: '💊' },
    { id: 'alectinib-complete', title: 'Лечение алектинибом', icon: '🎯' },
    { id: 'next-line', title: 'Следующая линия', icon: '➡️' }
  ]

  // ROS1 структура с группировкой
  const ros1Structure = [
    {
      groupTitle: 'Основная информация',
      sections: [
        { id: 'current-status', title: 'Текущий статус', icon: '📊' },
        { id: 'patient-basic', title: 'Базовые данные', icon: '👤' }
      ]
    },
    {
      groupTitle: 'Диагностика',
      sections: [
        { id: 'diagnosis-ros1', title: 'Диагноз и ROS1', icon: '🔍' },
        { id: 'pdl1-status', title: 'PD-L1 статус', icon: '🧬' }
      ]
    },
    {
      groupTitle: 'Радикальное лечение',
      sections: [
        { id: 'radical-treatment', title: 'Радикальное лечение', icon: '⚕️' }
      ]
    },
    {
      groupTitle: 'Метастатическая фаза',
      sections: [
        { id: 'metastatic-therapy', title: 'Линии терапии', icon: '💊' }
      ]
    }
  ]

  const sections = registryType === 'ROS1' 
    ? ros1Structure.flatMap(g => g.sections) 
    : alkSections
  
  // Инициализация формы с новыми полями
  const [formData, setFormData] = useState({
    // NEW FIELDS
    patient_code: '',
    date_filled: new Date().toISOString().split('T')[0],
    
    // Current status (moved to top)
    current_status: '',
    last_contact_date: '',
    
    // Базовые данные
    gender: '',
    birth_date: '',
    height: '',
    weight: '',
    comorbidities: [],
    smoking_status: '', // Now dropdown
    
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
    
    // Предыдущая терапия
    had_previous_therapy: false,
    no_previous_therapy: false, // NEW
    previous_therapy_types: [],
    previous_therapy_start_date: '',
    previous_therapy_end_date: '',
    previous_therapy_response: '',
    previous_therapy_stop_reason: '',
    
    // Алектиниб
    alectinib_start_date: '',
    stage_at_alectinib_start: '',
    ecog_at_start: '',
    metastases_sites: [],
    cns_metastases: false,
    cns_measurable: '',
    cns_symptomatic: '',
    cns_radiotherapy: '',
    
    // Ответ (CHANGED: single field instead of first/second control)
    maximum_response: '',
    earliest_response_date: '',
    intracranial_response: '',
    
    // Прогрессирование
    progression_during_alectinib: '',
    local_treatment_at_progression: '',
    progression_sites: [],
    progression_date: '',
    continued_after_progression: false,
    
    // Окончание
    alectinib_end_date: '',
    alectinib_stop_reason: '',
    had_treatment_interruption: false,
    interruption_reason: '',
    interruption_duration_months: '',
    had_dose_reduction: false,
    
    // След. линия
    next_line_treatments: [],
    next_line_start_date: '',
    progression_on_next_line: false,
    next_line_progression_type: '',
    next_line_progression_sites: [],
    next_line_progression_sites_other_text: '',
    progression_on_next_line_date: '',
    next_line_end_date: '',
    total_lines_after_alectinib: '',

    // ====== ROS1 SPECIFIC FIELDS ======
    // ROS1 диагностика
    ros1_fusion_variant: '',
    pdl1_status: '',
    pdl1_tps: '',

    // Радикальное лечение
    radical_treatment_conducted: false,
    radical_surgery_conducted: false,
    radical_surgery_date: '',
    radical_crt_conducted: false,
    radical_crt_start_date: '',
    radical_crt_end_date: '',
    radical_crt_consolidation: false,
    radical_crt_consolidation_drug: '',
    radical_crt_consolidation_end_date: '',
    radical_perioperative_therapy: [], // JSON: [{type: 'NEOADJUVANT'/'ADJUVANT', therapy: TherapyBuilder, start_date, end_date}]
    radical_treatment_outcome: '',
    relapse_date: '',

    // Метастатическая фаза
    metastatic_diagnosis_date: '',
    metastatic_therapy_lines: [] // JSON: [{line_number, therapy: TherapyBuilder, start_date, end_date, response, stop_reason}]
  })

  useEffect(() => {
    loadDictionaries()
    if (isEdit) {
      loadPatient()
    }
  }, [id])

  const loadDictionaries = async () => {
    try {
      const data = await dictionaryService.getDictionaries()
      const grouped = {}
      data.forEach(item => {
        if (!grouped[item.category]) {
          grouped[item.category] = []
        }
        grouped[item.category].push(item)
      })
      setDictionaries(grouped)
    } catch (err) {
      console.error('Error loading dictionaries:', err)
    }
  }

  const loadPatient = async () => {
    try {
      setLoading(true)
      const patient = await patientService.getPatient(id)
      if (patient.clinical_record) {
        const cr = { ...patient.clinical_record }
        // Convert dates
        const dateFields = [
          'birth_date', 'initial_diagnosis_date', 'metastatic_disease_date',
          'alk_diagnosis_date', 'previous_therapy_start_date', 'previous_therapy_end_date',
          'alectinib_start_date', 'earliest_response_date', 'progression_date',
          'alectinib_end_date', 'next_line_start_date', 'progression_on_next_line_date',
          'next_line_end_date', 'last_contact_date', 'date_filled',
          // ROS1 dates
          'radical_surgery_date', 'radical_crt_start_date', 'radical_crt_end_date',
          'radical_crt_consolidation_end_date', 'relapse_date', 'metastatic_diagnosis_date'
        ]
        dateFields.forEach(field => {
          if (cr[field]) {
            cr[field] = cr[field].split('T')[0]
          }
        })

        // Parse JSON fields (ROS1)
        if (cr.radical_perioperative_therapy && typeof cr.radical_perioperative_therapy === 'string') {
          try {
            cr.radical_perioperative_therapy = JSON.parse(cr.radical_perioperative_therapy)
          } catch (e) {
            cr.radical_perioperative_therapy = []
          }
        }
        if (cr.metastatic_therapy_lines && typeof cr.metastatic_therapy_lines === 'string') {
          try {
            cr.metastatic_therapy_lines = JSON.parse(cr.metastatic_therapy_lines)
          } catch (e) {
            cr.metastatic_therapy_lines = []
          }
        }

        setFormData(cr)
      }
    } catch (err) {
      setError('Ошибка загрузки данных пациента')
    } finally {
      setLoading(false)
    }
  }

  // Auto-save functionality
  const autoSave = useCallback(async (changedFields) => {
    if (!isEdit) return
    
    try {
      const response = await fetch(`/api/patients/${id}/auto-save`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(changedFields)
      })
      
      if (response.ok) {
        console.log('Auto-saved:', Object.keys(changedFields))
      }
    } catch (err) {
      console.error('Auto-save error:', err)
    }
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value
    
    setFormData(prev => {
      const updated = { ...prev, [name]: newValue }
      
      // Auto-save logic - debounced
      if (isEdit) {
        if (autoSaveTimer) {
          clearTimeout(autoSaveTimer)
        }
        
        const timer = setTimeout(() => {
          autoSave({ [name]: newValue })
        }, 1000) // 1 second delay
        
        setAutoSaveTimer(timer)
      }
      
      return updated
    })
    
    // Special logic for CNS metastases auto-check
    if (name === 'metastases_sites') {
      const sites = Array.isArray(value) ? value : (formData.metastases_sites || [])
      if (sites.includes('CNS')) {
        setFormData(prev => ({ ...prev, cns_metastases: true }))
      }
    }
    
    // Logic for no previous therapy
    if (name === 'no_previous_therapy' && checked) {
      setFormData(prev => ({ 
        ...prev, 
        had_previous_therapy: false,
        previous_therapy_types: [],
        previous_therapy_start_date: '',
        previous_therapy_end_date: '',
        previous_therapy_response: '',
        previous_therapy_stop_reason: ''
      }))
    }
  }

  const handleMultiSelect = (name, value) => {
    setFormData(prev => {
      const currentValues = prev[name] || []
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      
      const updated = { ...prev, [name]: newValues }
      
      // Auto-check CNS metastases when ЦНС is selected
      if (name === 'metastases_sites' && newValues.includes('CNS')) {
        updated.cns_metastases = true
      }
      
      // Auto-save
      if (isEdit) {
        if (autoSaveTimer) clearTimeout(autoSaveTimer)
        const timer = setTimeout(() => autoSave({ [name]: newValues }), 1000)
        setAutoSaveTimer(timer)
      }
      
      return updated
    })
  }

  const handleSubmit = async (e) => {
  e.preventDefault()
  setSaving(true)
  setError('')

  try {
    // Validate ROS1-specific fields
    if (registryType === 'ROS1') {
      const validationErrors = validateROS1Fields()
      if (validationErrors.length > 0) {
        setError(validationErrors.join('; '))
        setSaving(false)
        return
      }
    }
    // Prepare dates - ensure they are in correct format
    const preparedData = { ...formData }
    
    // Convert empty strings to null for optional date fields
    const dateFields = [
      'birth_date', 'initial_diagnosis_date', 'metastatic_disease_date',
      'alk_diagnosis_date', 'previous_therapy_start_date', 'previous_therapy_end_date',
      'alectinib_start_date', 'earliest_response_date', 'progression_date',
      'alectinib_end_date', 'next_line_start_date', 'progression_on_next_line_date',
      'next_line_end_date', 'last_contact_date', 'date_filled',
      // ROS1 dates
      'radical_surgery_date', 'radical_crt_start_date', 'radical_crt_end_date',
      'radical_crt_consolidation_end_date', 'relapse_date', 'metastatic_diagnosis_date'
    ]
    
    dateFields.forEach(field => {
      if (preparedData[field] === '') {
        preparedData[field] = null
      }
      else if (preparedData[field] && !preparedData[field].includes('T')) {
        // Добавляем время 00:00:00, если его нет
        preparedData[field] = preparedData[field] + 'T00:00:00'
      }
    })
    
    // Convert empty arrays to null or remove them
    const arrayFields = [
      'comorbidities', 'alk_methods', 'previous_therapy_types',
      'metastases_sites', 'progression_sites', 'next_line_treatments', 'next_line_progression_sites'
    ]
    
    arrayFields.forEach(field => {
      if (!preparedData[field] || preparedData[field].length === 0) {
        preparedData[field] = []
      }
    })
    
    // Convert numeric strings to numbers
    const numericFields = ['height', 'weight', 'ecog_at_start', 'interruption_duration_months', 'total_lines_after_alectinib', 'pdl1_tps']
    numericFields.forEach(field => {
      if (preparedData[field] === '') {
        preparedData[field] = null
      } else if (preparedData[field]) {
        preparedData[field] = parseFloat(preparedData[field])
      }
    })

    // Stringify JSON fields (ROS1)
    if (preparedData.radical_perioperative_therapy && Array.isArray(preparedData.radical_perioperative_therapy)) {
      preparedData.radical_perioperative_therapy = JSON.stringify(preparedData.radical_perioperative_therapy)
    }
    if (preparedData.metastatic_therapy_lines && Array.isArray(preparedData.metastatic_therapy_lines)) {
      preparedData.metastatic_therapy_lines = JSON.stringify(preparedData.metastatic_therapy_lines)
    }

    const payload = {
      clinical_record: preparedData
    }

    // Добавляем registry_type при создании нового пациента
    if (!isEdit && registryType) {
      payload.registry_type = registryType
    }

    console.log('Sending payload:', JSON.stringify(payload, null, 2)) // Debug log

    if (isEdit) {
      await patientService.updatePatient(id, payload)
    } else {
      const result = await patientService.createPatient(payload)
      // For new patient, navigate to edit mode instead of patients list
      if (result?.id) {
        navigate(`/patients/${result.id}`)
        return
      }
    }

    // Navigate to the next section or patients list
    const currentIndex = sections.findIndex(s => s.id === currentSection)
    if (currentIndex < sections.length - 1) {
      // Move to next section
      const nextSection = sections[currentIndex + 1].id
      setCurrentSection(nextSection)
    } else {
      // Last section, navigate to patients list
      navigate('/patients')
    }
  } catch (err) {
    console.error('Submit error:', err) // Debug log
    const errorMessage = err.response?.data?.detail || err.message || 'Ошибка сохранения'
    setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
  } finally {
    setSaving(false)
  }
}

  // Date validation rules
  const dateValidationRules = {
    alk_diagnosis_date: [
      {
        type: 'before',
        compareWith: 'initial_diagnosis_date',
        message: 'Дата диагностики ALK не может быть раньше даты первоначального диагноза'
      }
    ],
    birth_date: [
      {
        type: 'after',
        compareWith: 'initial_diagnosis_date',
        message: 'Дата рождения не может быть позже даты диагноза'
      }
    ],
    previous_therapy_end_date: [
      {
        type: 'before',
        compareWith: 'previous_therapy_start_date',
        message: 'Дата окончания не может быть раньше даты начала'
      }
    ],
    alectinib_end_date: [
      {
        type: 'before',
        compareWith: 'alectinib_start_date',
        message: 'Дата окончания не может быть раньше даты начала'
      }
    ],
    // ROS1 validation rules
    radical_crt_end_date: [
      {
        type: 'before',
        compareWith: 'radical_crt_start_date',
        message: 'Дата окончания ХЛТ не может быть раньше даты начала'
      }
    ],
    relapse_date: [
      {
        type: 'before',
        compareWith: 'radical_surgery_date',
        message: 'Дата рецидива должна быть после радикального лечения'
      }
    ],
    metastatic_diagnosis_date: [
      {
        type: 'before',
        compareWith: 'initial_diagnosis_date',
        message: 'Дата метастатической фазы не может быть раньше первоначального диагноза'
      }
    ]
  }

  // ROS1 validation function
  const validateROS1Fields = () => {
    const errors = []

    // Валидация: если radical_treatment_outcome === RELAPSE, то relapse_date обязательна
    if (formData.radical_treatment_outcome === 'RELAPSE' && !formData.relapse_date) {
      errors.push('При исходе "Рецидив" необходимо указать дату рецидива')
    }

    // Валидация: если pdl1_status !== UNKNOWN, то pdl1_tps обязательна
    if (formData.pdl1_status && formData.pdl1_status !== 'UNKNOWN' && !formData.pdl1_tps) {
      errors.push('При указанном PD-L1 статусе необходимо указать PD-L1 TPS')
    }

    // Валидация: дата начала 1-й линии >= relapse_date или metastatic_diagnosis_date
    if (formData.metastatic_therapy_lines && formData.metastatic_therapy_lines.length > 0) {
      const firstLine = formData.metastatic_therapy_lines[0]
      const minDate = formData.relapse_date || formData.metastatic_diagnosis_date
      
      if (firstLine.start_date && minDate) {
        if (new Date(firstLine.start_date) < new Date(minDate)) {
          errors.push('Дата начала первой линии терапии не может быть раньше даты рецидива или метастатической фазы')
        }
      }
    }

    return errors
  }

    const renderMultiSelect = (name, category, label) => {
    let options = dictionaries[category] || []
    const selected = formData[name] || []

    // Скрыть вариант "CNS" из метастаз на момент начала
    if (name === 'metastases_sites') {
      options = options.filter(opt => opt.code !== 'CNS')
    }

    return (
      <div className="form-group">
        <label className="form-label">{label}</label>
        <div className="checkbox-group">
          {options.map(opt => (
            <label key={opt.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={selected.includes(opt.code)}
                onChange={() => handleMultiSelect(name, opt.code)}
              />
              <span>{opt.value_ru}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }
  // const renderMultiSelect = (name, category, label) => {
  //   const options = dictionaries[category] || []
  //   const selected = formData[name] || []
    
  //   return (
  //     <div className="form-group">
  //       <label className="form-label">{label}</label>
  //       <div className="checkbox-group">
  //         {options.map(opt => (
  //           <label key={opt.id} className="checkbox-label">
  //             <input
  //               type="checkbox"
  //               checked={selected.includes(opt.code)}
  //               onChange={() => handleMultiSelect(name, opt.code)}
  //             />
  //             <span>{opt.value_ru}</span>
  //           </label>
  //         ))}
  //       </div>
  //     </div>
  //   )
  // }

  const renderSelect = (name, category, label, required = false) => {
    const options = dictionaries[category] || []
    
    return (
      <div className="form-group">
        <label className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
        <select
          name={name}
          value={formData[name]}
          onChange={handleChange}
          className="form-select"
          required={required}
        >
          <option value="">Выберите...</option>
          {options.map(opt => (
            <option key={opt.id} value={opt.code}>
              {opt.value_ru}
            </option>
          ))}
        </select>
      </div>
    )
  }

  const renderSection = () => {
    // Условный рендеринг на основе registryType
    const isROS1 = registryType === 'ROS1'
    const isALK = registryType === 'ALK'

    switch(currentSection) {
      case 'current-status':
        return (
          <div className="card">
            <h3>Текущий статус пациента</h3>
            <div className="grid grid-2">
              {renderSelect('current_status', 'current_status', 'Статус')}
              
              <div className="form-group">
                <label className="form-label">
                  {formData.current_status === 'DEAD' ? 'Дата смерти' : 'Дата последнего контакта'}
                </label>
                <DateValidation
                  name="last_contact_date"
                  label=""
                  value={formData.last_contact_date}
                  onChange={handleChange}
                  tooltip="Используйте 15 число месяца, если точная дата неизвестна"
                />
              </div>
            </div>
          </div>
        )

      case 'patient-basic':
        return (
          <>
            <div className="card">
              <h3>Код пациента и дата заполнения</h3>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Код пациента</label>
                  <input
                    type="text"
                    name="patient_code"
                    value={formData.patient_code}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Введите уникальный код пациента"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Дата заполнения</label>
                  <DateValidation
                    name="date_filled"
                    label=""
                    value={formData.date_filled}
                    onChange={handleChange}
                    tooltip="Используйте 15 число месяца, если точная дата неизвестна"
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Базовые данные пациента</h3>
              
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Пол<span className="required">*</span></label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="form-select" required>
                    <option value="">Выберите...</option>
                    <option value="м">Мужской</option>
                    <option value="ж">Женский</option>
                  </select>
                </div>

                <DateValidation
                  name="birth_date"
                  label="Дата рождения"
                  value={formData.birth_date}
                  onChange={handleChange}
                  validationRules={dateValidationRules.birth_date || []}
                  otherDates={formData}
                  tooltip="Используйте 15 число месяца, если точная дата неизвестна"
                />

                <div className="form-group">
                  <label className="form-label">Рост (см)</label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    className="form-input"
                    min="50"
                    max="250"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Вес на начало лечения (кг)</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    className="form-input"
                    min="20"
                    max="300"
                  />
                </div>
              </div>

              {renderMultiSelect('comorbidities', 'comorbidities', 'Сопутствующие заболевания')}

              {renderSelect('smoking_status', 'smoking_status', 'Статус курения')}
            </div>
          </>
        )

      case 'diagnosis-alk':
        // Только для ALK регистра
        if (!isALK) return null
        
        return (
          <>
            <div className="card">
              <h3>Диагноз</h3>
              
              <div className="grid grid-2">
                <DateValidation
                  name="initial_diagnosis_date"
                  label="Дата первоначального диагноза"
                  value={formData.initial_diagnosis_date}
                  onChange={handleChange}
                  tooltip="Используйте 15 число месяца, если точная дата неизвестна"
                />

                <TNMSelect
                  name="tnm_stage"
                  label="Стадия TNM (8-я классификация)"
                  value={formData.tnm_stage}
                  onChange={handleChange}
                  options={dictionaries.tnm_stage || []}
                />

                <div className="form-group">
                  <label className="form-label">
                    Дата установки метастатического заболевания 
                    <span className="form-help">(заполнять только если отличается)</span>
                  </label>
                  <DateValidation
                    name="metastatic_disease_date"
                    label=""
                    value={formData.metastatic_disease_date}
                    onChange={handleChange}
                    tooltip="Используйте 15 число месяца, если точная дата неизвестна"
                  />
                </div>

                {renderSelect('histology', 'histology', 'Гистология')}
              </div>
            </div>

            <div className="card">
              <h3>ALK диагностика</h3>
              
              <div className="grid grid-2">
                <DateValidation
                  name="alk_diagnosis_date"
                  label="Дата диагностики ALK транслокации"
                  value={formData.alk_diagnosis_date}
                  onChange={handleChange}
                  validationRules={dateValidationRules.alk_diagnosis_date || []}
                  otherDates={formData}
                  tooltip="Используйте 15 число месяца, если точная дата неизвестна"
                />

                {renderSelect('alk_fusion_variant', 'alk_fusion_variant', 'Вариант ALK-фузии')}
                {renderSelect('tp53_comutation', 'yes_no_unknown', 'Ко-мутация TP53')}
                {renderSelect('ttf1_expression', 'yes_no_unknown', 'Экспрессия TTF-1')}
              </div>

              {renderMultiSelect('alk_methods', 'alk_methods', 'Метод диагностики')}
            </div>
          </>
        )

      // ====== ROS1 SECTIONS ======
      case 'diagnosis-ros1':
        // Только для ROS1 регистра
        if (!isROS1) return null
        
        return (
          <div className="card">
            <h3>Диагноз и ROS1 диагностика</h3>
            
            <div className="grid grid-2">
              <DateValidation
                name="initial_diagnosis_date"
                label="Дата первоначального диагноза"
                value={formData.initial_diagnosis_date}
                onChange={handleChange}
                tooltip="Используйте 15 число месяца, если точная дата неизвестна"
              />

              <TNMSelect
                name="tnm_stage"
                label="Стадия TNM (8-я классификация)"
                value={formData.tnm_stage}
                onChange={handleChange}
                options={dictionaries.tnm_stage || []}
              />

              {renderSelect('histology', 'histology', 'Гистология')}
              {renderSelect('ros1_fusion_variant', 'ros1_fusion_variant', 'Вариант ROS1-фузии')}
              {renderSelect('tp53_comutation', 'yes_no_unknown', 'Ко-мутация TP53')}
              {renderSelect('ttf1_expression', 'yes_no_unknown', 'Экспрессия TTF-1')}
            </div>
          </div>
        )

      case 'pdl1-status':
        // Только для ROS1 регистра
        if (!isROS1) return null
        
        return (
          <div className="card">
            <h3>PD-L1 статус</h3>
            
            <div className="grid grid-2">
              {renderSelect('pdl1_status', 'pdl1_status', 'PD-L1 статус')}
              
              {formData.pdl1_status && formData.pdl1_status !== 'UNKNOWN' && (
                <div className="form-group">
                  <label className="form-label">PD-L1 TPS (%) *</label>
                  <input
                    type="number"
                    name="pdl1_tps"
                    value={formData.pdl1_tps}
                    onChange={handleChange}
                    className="form-input"
                    min="0"
                    max="100"
                    required
                  />
                  <small className="form-help">Введите процент TPS (0-100)</small>
                </div>
              )}
            </div>
          </div>
        )

      case 'radical-treatment':
        // Только для ROS1 регистра
        if (!isROS1) return null
        
        return (
          <>
            <div className="card">
              <h3>Радикальное лечение</h3>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="radical_treatment_conducted"
                    checked={formData.radical_treatment_conducted}
                    onChange={handleChange}
                  />
                  <span>Проводилось радикальное лечение</span>
                </label>
              </div>

              {formData.radical_treatment_conducted && (
                <>
                  {/* Хирургия */}
                  <div className="subsection">
                    <h4>Хирургическое лечение</h4>
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="radical_surgery_conducted"
                          checked={formData.radical_surgery_conducted}
                          onChange={handleChange}
                        />
                        <span>Проведена радикальная операция</span>
                      </label>
                    </div>

                    {formData.radical_surgery_conducted && (
                      <div className="grid grid-2">
                        <DateValidation
                          name="radical_surgery_date"
                          label="Дата операции"
                          value={formData.radical_surgery_date}
                          onChange={handleChange}
                        />
                      </div>
                    )}
                  </div>

                  {/* ХЛТ */}
                  <div className="subsection">
                    <h4>Химиолучевая терапия (ХЛТ)</h4>
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="radical_crt_conducted"
                          checked={formData.radical_crt_conducted}
                          onChange={handleChange}
                        />
                        <span>Проведена ХЛТ</span>
                      </label>
                    </div>

                    {formData.radical_crt_conducted && (
                      <>
                        <div className="grid grid-2">
                          <DateValidation
                            name="radical_crt_start_date"
                            label="Дата начала ХЛТ"
                            value={formData.radical_crt_start_date}
                            onChange={handleChange}
                          />
                          <DateValidation
                            name="radical_crt_end_date"
                            label="Дата окончания ХЛТ"
                            value={formData.radical_crt_end_date}
                            onChange={handleChange}
                          />
                        </div>

                        <div className="form-group">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              name="radical_crt_consolidation"
                              checked={formData.radical_crt_consolidation}
                              onChange={handleChange}
                            />
                            <span>Консолидация после ХЛТ</span>
                          </label>
                        </div>

                        {formData.radical_crt_consolidation && (
                          <div className="grid grid-2">
                            <div className="form-group">
                              <label className="form-label">Препарат консолидации</label>
                              <input
                                type="text"
                                name="radical_crt_consolidation_drug"
                                value={formData.radical_crt_consolidation_drug}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="Название препарата"
                              />
                            </div>
                            <DateValidation
                              name="radical_crt_consolidation_end_date"
                              label="Дата окончания консолидации"
                              value={formData.radical_crt_consolidation_end_date}
                              onChange={handleChange}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Периоперационная терапия */}
                  <div className="subsection">
                    <h4>Периоперационная терапия</h4>
                    <p className="form-help">Неоадъювантная и/или адъювантная терапия</p>
                    
                    {(formData.radical_perioperative_therapy || []).map((therapy, index) => (
                      <div key={index} className="therapy-item">
                        <div className="therapy-header">
                          <h5>Терапия {index + 1}</h5>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.radical_perioperative_therapy.filter((_, i) => i !== index)
                              setFormData({ ...formData, radical_perioperative_therapy: updated })
                            }}
                            className="btn-remove"
                          >
                            Удалить
                          </button>
                        </div>

                        <div className="grid grid-2">
                          <div className="form-group">
                            <label className="form-label">Тип терапии</label>
                            <select
                              value={therapy.type || ''}
                              onChange={(e) => {
                                const updated = [...formData.radical_perioperative_therapy]
                                updated[index] = { ...updated[index], type: e.target.value }
                                setFormData({ ...formData, radical_perioperative_therapy: updated })
                              }}
                              className="form-select"
                            >
                              <option value="">Выберите...</option>
                              <option value="NEOADJUVANT">Неоадъювантная</option>
                              <option value="ADJUVANT">Адъювантная</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Режим терапии</label>
                          <TherapyBuilder
                            value={therapy.therapy}
                            onChange={(newTherapy) => {
                              const updated = [...formData.radical_perioperative_therapy]
                              updated[index] = { ...updated[index], therapy: newTherapy }
                              setFormData({ ...formData, radical_perioperative_therapy: updated })
                            }}
                          />
                        </div>

                        <div className="grid grid-2">
                          <DateValidation
                            name={`periop_start_${index}`}
                            label="Дата начала"
                            value={therapy.start_date || ''}
                            onChange={(e) => {
                              const updated = [...formData.radical_perioperative_therapy]
                              updated[index] = { ...updated[index], start_date: e.target.value }
                              setFormData({ ...formData, radical_perioperative_therapy: updated })
                            }}
                          />
                          <DateValidation
                            name={`periop_end_${index}`}
                            label="Дата окончания"
                            value={therapy.end_date || ''}
                            onChange={(e) => {
                              const updated = [...formData.radical_perioperative_therapy]
                              updated[index] = { ...updated[index], end_date: e.target.value }
                              setFormData({ ...formData, radical_perioperative_therapy: updated })
                            }}
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        const updated = [
                          ...(formData.radical_perioperative_therapy || []),
                          { type: '', therapy: null, start_date: '', end_date: '' }
                        ]
                        setFormData({ ...formData, radical_perioperative_therapy: updated })
                      }}
                      className="btn btn-secondary"
                    >
                      + Добавить периоперационную терапию
                    </button>
                  </div>

                  {/* Исход радикального лечения */}
                  <div className="subsection">
                    <h4>Исход радикального лечения</h4>
                    <div className="grid grid-2">
                      {renderSelect('radical_treatment_outcome', 'radical_treatment_outcome', 'Исход')}
                      
                      {formData.radical_treatment_outcome === 'RELAPSE' && (
                        <DateValidation
                          name="relapse_date"
                          label="Дата рецидива *"
                          value={formData.relapse_date}
                          onChange={handleChange}
                          required
                        />
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )

      case 'metastatic-therapy':
        // Только для ROS1 регистра
        if (!isROS1) return null
        
        const minStartDate = formData.relapse_date || formData.metastatic_diagnosis_date || formData.initial_diagnosis_date
        
        return (
          <div className="card">
            <h3>Лечение метастатического процесса</h3>
            
            <div className="grid grid-2">
              <DateValidation
                name="metastatic_diagnosis_date"
                label="Дата установления метастатического заболевания"
                value={formData.metastatic_diagnosis_date}
                onChange={handleChange}
                tooltip="Дата начала метастатической фазы или дата рецидива"
              />
            </div>

            <TherapyLinesTable
              value={formData.metastatic_therapy_lines || []}
              onChange={(lines) => setFormData({ ...formData, metastatic_therapy_lines: lines })}
              dictionaries={dictionaries}
              minStartDate={minStartDate}
            />
          </div>
        )

      case 'previous-therapy':
        return (
          <div className="card">
            <h3>Предыдущая системная терапия</h3>
            
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="no_previous_therapy"
                  checked={formData.no_previous_therapy}
                  onChange={handleChange}
                />
                <span>Не было предыдущей терапии</span>
              </label>
            </div>

            {!formData.no_previous_therapy && (
              <>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="had_previous_therapy"
                      checked={formData.had_previous_therapy}
                      onChange={handleChange}
                    />
                    <span>Была предыдущая терапия</span>
                  </label>
                </div>

                {formData.had_previous_therapy && (
                  <>
                    {renderMultiSelect('previous_therapy_types', 'previous_therapy_types', 'Тип лечения')}
                    
                    <div className="grid grid-2">
                      <DateValidation
                        name="previous_therapy_start_date"
                        label="Дата начала"
                        value={formData.previous_therapy_start_date}
                        onChange={handleChange}
                      />

                      <DateValidation
                        name="previous_therapy_end_date"
                        label="Дата окончания"
                        value={formData.previous_therapy_end_date}
                        onChange={handleChange}
                        validationRules={dateValidationRules.previous_therapy_end_date || []}
                        otherDates={formData}
                      />

                      {renderSelect('previous_therapy_response', 'response', 'Максимальный эффект')}
                      {renderSelect('previous_therapy_stop_reason', 'previous_therapy_stop_reason', 'Причина прекращения')}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )

      case 'alectinib-complete':
        return (
          <>
            <div className="card">
              <h3>Лечение алектинибом</h3>
              
              <div className="grid grid-2">
                <DateValidation
                  name="alectinib_start_date"
                  label="Дата начала лечения"
                  value={formData.alectinib_start_date}
                  onChange={handleChange}
                  tooltip="Используйте 15 число месяца, если точная дата неизвестна"
                />

                {renderSelect('stage_at_alectinib_start', 'stage_at_alectinib_start', 'Стадия на момент начала')}

                {renderSelect('alectinib_therapy_status', 'alectinib_therapy_status', 'Статус терапии алектинибом', true)}
                <div className="form-group">
                  <label className="form-label">ECOG статус (0-4)</label>
                  <input
                    type="number"
                    name="ecog_at_start"
                    value={formData.ecog_at_start}
                    onChange={handleChange}
                    className="form-input"
                    min="0"
                    max="4"
                  />
                </div>
              </div>

              {renderMultiSelect('metastases_sites', 'metastases_sites', 'Метастазы на момент начала')}

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="cns_metastases"
                    checked={formData.cns_metastases}
                    onChange={handleChange}
                  />
                  <span>Метастазы в ЦНС</span>
                </label>
              </div>

              {formData.cns_metastases && (
                <div className="grid grid-3">
                  {renderSelect('cns_measurable', 'cns_measurable', 'Измеряемость')}
                  {renderSelect('cns_symptomatic', 'cns_symptomatic', 'Симптоматичность')}
                  {renderSelect('cns_radiotherapy', 'cns_radiotherapy', 'Радиотерапия')}
                </div>
              )}
            </div>

            <div className="card">
              <h3>Максимальный ответ на терапию алектинибом</h3>
              
              <div className="grid grid-2">
                {renderSelect('maximum_response', 'response', 'Максимальный ответ')}
                
                <DateValidation
                  name="maximum_response_date"
                  label="Дата достижения наибольшего ответа"
                  value={formData.earliest_response_date}
                  onChange={handleChange}
                  tooltip="Используйте 15 число месяца, если точная дата неизвестна"
                />

                {formData.cns_metastases && renderSelect('intracranial_response', 'response', 'Интракраниальный ответ')}
              </div>
            </div>

            <div className="card">
              <h3>Прогрессирование</h3>
              
              <div className="grid grid-2">
                {renderSelect('progression_during_alectinib', 'progression_type', 'Прогрессирование во время лечения')}
                
                {formData.progression_during_alectinib && formData.progression_during_alectinib !== 'NONE' && (
                  <>
                    {renderSelect('local_treatment_at_progression', 'local_treatment_at_progression', 'Локальное лечение при прогрессировании')}
                    
                    <DateValidation
                      name="progression_date"
                      label="Дата прогрессирования"
                      value={formData.progression_date}
                      onChange={handleChange}
                      tooltip="Используйте 15 число месяца, если точная дата неизвестна"
                    />

                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="continued_after_progression"
                          checked={formData.continued_after_progression}
                          onChange={handleChange}
                        />
                        <span>Продолжение лечения после прогрессирования</span>
                      </label>
                    </div>
                  </>
                )}
              </div>

              {formData.progression_during_alectinib && formData.progression_during_alectinib !== 'NONE' && 
                renderMultiSelect('progression_sites', 'metastases_sites', 'Место прогрессирования')
              }
              {formData.progression_during_alectinib && formData.progression_during_alectinib !== 'NONE' &&
                formData.progression_sites && formData.progression_sites.includes('OTHER') && (
                  <div className="form-group">
                    <label className="form-label">Другое место прогрессирования (уточните)</label>
                    <input type="text" name="progression_sites_other_text" value={formData.progression_sites_other_text || ''} onChange={handleChange} className="form-input" placeholder="Укажите место прогрессирования" />
                  </div>
                )
              }
            </div>
          {formData.alectinib_therapy_status == 'STOPPED' && (
            <div className="card">
              <h3>Окончание лечения алектинибом</h3>
              
              <div className="grid grid-2">
                <DateValidation
                  name="alectinib_end_date"
                  label="Дата окончания"
                  value={formData.alectinib_end_date}
                  onChange={handleChange}
                  validationRules={dateValidationRules.alectinib_end_date || []}
                  otherDates={formData}
                  tooltip="Используйте 15 число месяца, если точная дата неизвестна"
                />

                {renderSelect('alectinib_stop_reason', 'alectinib_stop_reason', 'Причина окончания')}

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="had_treatment_interruption"
                      checked={formData.had_treatment_interruption}
                      onChange={handleChange}
                    />
                    <span>Было прерывание лечения</span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="had_dose_reduction"
                      checked={formData.had_dose_reduction}
                      onChange={handleChange}
                    />
                    <span>Снижение дозы из-за НЯ</span>
                  </label>
                </div>
              </div>

              {formData.had_treatment_interruption && (
                <div className="grid grid-2">
                  {renderSelect('interruption_reason', 'interruption_reason', 'Причина прерывания')}
                  
                  <div className="form-group">
                    <label className="form-label">Длительность прерывания (месяцев)</label>
                    <input
                      type="number"
                      name="interruption_duration_months"
                      value={formData.interruption_duration_months}
                      onChange={handleChange}
                      className="form-input"
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>
              )}
            </div>
            )}
          </>
        )

      case 'next-line':
        if (formData.alectinib_therapy_status !== 'STOPPED') {
          return (
            <div className="card">
              <h3>Следующая линия терапии</h3>
              <p>Доступно только при статусе терапии "Прекращена"</p>
            </div>
          )
        }

        return (
          <div className="card">
            <h3>Следующая линия терапии</h3>
            
            {renderMultiSelect('next_line_treatments', 'next_line_treatments', 'Лечение после отмены алектиниба')}
            
            <div className="grid grid-2">
              <DateValidation
                name="next_line_start_date"
                label="Дата начала следующей линии"
                value={formData.next_line_start_date}
                onChange={handleChange}
                tooltip="Используйте 15 число месяца, если точная дата неизвестна"
              />

              <DateValidation
                name="next_line_end_date"
                label="Дата окончания"
                value={formData.next_line_end_date}
                onChange={handleChange}
                tooltip="Используйте 15 число месяца, если точная дата неизвестна"
              />

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="progression_on_next_line"
                    checked={formData.progression_on_next_line}
                    onChange={handleChange}
                  />
                  <span>Прогрессирование на следующей линии</span>
                </label>
              </div>

              {formData.progression_on_next_line && (
                <>
                <DateValidation
                  name="progression_on_next_line_date"
                  label="Дата прогрессирования"
                  value={formData.progression_on_next_line_date}
                  onChange={handleChange}
                  tooltip="Используйте 15 число месяца, если точная дата неизвестна"
                />

                {renderSelect('next_line_progression_type', 'progression_type', 'Тип прогрессирования')}
                </>
              )}

              <div className="form-group">
                <label className="form-label">Всего линий после алектиниба</label>
                <input
                  type="number"
                  name="total_lines_after_alectinib"
                  value={formData.total_lines_after_alectinib}
                  onChange={handleChange}
                  className="form-input"
                  min="0"
                />
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>
  }

  return (
    <div className="patient-form-page-new">
      <div className="form-layout">
        <PatientFormSidebar 
          currentSection={currentSection}
          onSectionChange={setCurrentSection}
          sections={registryType === 'ALK' ? alkSections : []}
          structure={registryType === 'ROS1' ? ros1Structure : null}
          formData={formData}
        />
        
        <div className="form-content">
          <div className="form-header">
            <div className="header-info">
              <h2>{isEdit ? 'Редактирование пациента' : 'Новый пациент'}</h2>
              {isEdit && (
                <div className="auto-save-status">
                  <span className="save-indicator">💾</span>
                  Автосохранение включено
                </div>
              )}
            </div>
            <button onClick={() => navigate('/patients')} className="btn btn-secondary">
              Закрыть
            </button>
          </div>

          {/* Persistent Patient Info Header */}
          {(formData.patient_code || formData.tnm_stage || formData.current_status) && (
            <div className="patient-info-header">
              {formData.patient_code && (
                <div className="info-item">
                  <span className="info-label">Код пациента:</span>
                  <span className="info-value">{formData.patient_code}</span>
                </div>
              )}
              {formData.tnm_stage && (
                <div className="info-item">
                  <span className="info-label">Стадия:</span>
                  <span className="info-value">{formData.tnm_stage}</span>
                </div>
              )}
              {formData.current_status && (
                <div className="info-item">
                  <span className="info-label">Статус:</span>
                  <span className={`info-value status-${formData.current_status?.toLowerCase()}`}>
                    {formData.current_status === 'ALIVE' ? 'Жив' : 
                     formData.current_status === 'DEAD' ? 'Умер' :
                     formData.current_status === 'LOST_TO_FOLLOWUP' ? 'Ушел из наблюдения' :
                     formData.current_status}
                  </span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="alert alert-error">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            {renderSection()}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Сохранение...' : 
                 (sections.findIndex(s => s.id === currentSection) < sections.length - 1) ? 
                 'Сохранить и далее' : 'Сохранить'}
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/patients')} 
                className="btn btn-secondary"
                disabled={saving}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PatientFormPageNew
