import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { patientService } from '../services/patientService'
import { dictionaryService } from '../services/dictionaryService'
import './PatientFormPage.css'

function PatientFormPage({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dictionaries, setDictionaries] = useState({})
  
  // Инициализация формы
  const [formData, setFormData] = useState({
    // Базовые данные
    gender: '',
    birth_date: '',
    height: '',
    weight: '',
    comorbidities: [],
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
    
    // Предыдущая терапия
    had_previous_therapy: false,
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
    
    // Ответ
    first_control_response: '',
    second_control_response: '',
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
    progression_on_next_line_date: '',
    next_line_end_date: '',
    total_lines_after_alectinib: '',
    
    // Статус
    current_status: '',
    last_contact_date: '',
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
        // Преобразование дат из ISO в локальный формат
        const cr = { ...patient.clinical_record }
        const dateFields = [
          'birth_date', 'initial_diagnosis_date', 'metastatic_disease_date',
          'alk_diagnosis_date', 'previous_therapy_start_date', 'previous_therapy_end_date',
          'alectinib_start_date', 'earliest_response_date', 'progression_date',
          'alectinib_end_date', 'next_line_start_date', 'progression_on_next_line_date',
          'next_line_end_date', 'last_contact_date'
        ]
        dateFields.forEach(field => {
          if (cr[field]) {
            cr[field] = cr[field].split('T')[0]
          }
        })
        setFormData(cr)
      }
    } catch (err) {
      setError('Ошибка загрузки данных пациента')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleMultiSelect = (name, value) => {
    setFormData(prev => {
      const currentValues = prev[name] || []
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      return { ...prev, [name]: newValues }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        clinical_record: formData
      }

      if (isEdit) {
        await patientService.updatePatient(id, payload)
      } else {
        await patientService.createPatient(payload)
      }

      navigate('/patients')
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const renderMultiSelect = (name, category, label) => {
    const options = dictionaries[category] || []
    const selected = formData[name] || []
    
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

  if (loading) {
    return <div className="loading">Загрузка...</div>
  }

  return (
    <div className="patient-form-page">
      <div className="page-header">
        <h2>{isEdit ? 'Редактирование пациента' : 'Новый пациент'}</h2>
        <button onClick={() => navigate('/patients')} className="btn btn-secondary">
          Отмена
        </button>
      </div>

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Базовые данные */}
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

            <div className="form-group">
              <label className="form-label">Дата рождения</label>
              <input
                type="date"
                name="birth_date"
                value={formData.birth_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>

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

          <div className="form-group">
            <label className="form-label">Статус курения</label>
            <textarea
              name="smoking_status"
              value={formData.smoking_status}
              onChange={handleChange}
              className="form-textarea"
              placeholder="Например: курил 15 пачка/лет, не курил"
            />
          </div>
        </div>

        {/* Диагноз */}
        <div className="card">
          <h3>Диагноз</h3>
          
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Дата первоначального диагноза</label>
              <input
                type="date"
                name="initial_diagnosis_date"
                value={formData.initial_diagnosis_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Стадия TNM</label>
              <input
                type="text"
                name="tnm_stage"
                value={formData.tnm_stage}
                onChange={handleChange}
                className="form-input"
                placeholder="TNM по 8-й классификации"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Дата установки метастатического заболевания</label>
              <input
                type="date"
                name="metastatic_disease_date"
                value={formData.metastatic_disease_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {renderSelect('histology', 'histology', 'Гистология')}
          </div>
        </div>

        {/* ALK диагностика */}
        <div className="card">
          <h3>ALK диагностика</h3>
          
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Дата диагностики ALK транслокации</label>
              <input
                type="date"
                name="alk_diagnosis_date"
                value={formData.alk_diagnosis_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {renderSelect('alk_fusion_variant', 'alk_fusion_variant', 'Вариант ALK-фузии')}
            {renderSelect('tp53_comutation', 'yes_no_unknown', 'Ко-мутация TP53')}
            {renderSelect('ttf1_expression', 'yes_no_unknown', 'Экспрессия TTF-1')}
          </div>

          {renderMultiSelect('alk_methods', 'alk_methods', 'Метод диагностики')}
        </div>

        {/* Предыдущая терапия */}
        <div className="card">
          <h3>Предыдущая системная терапия</h3>
          
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
                <div className="form-group">
                  <label className="form-label">Дата начала</label>
                  <input
                    type="date"
                    name="previous_therapy_start_date"
                    value={formData.previous_therapy_start_date}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Дата окончания</label>
                  <input
                    type="date"
                    name="previous_therapy_end_date"
                    value={formData.previous_therapy_end_date}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                {renderSelect('previous_therapy_response', 'response', 'Максимальный эффект')}
                {renderSelect('previous_therapy_stop_reason', 'previous_therapy_stop_reason', 'Причина прекращения')}
              </div>
            </>
          )}
        </div>

        {/* Лечение алектинибом */}
        <div className="card">
          <h3>Лечение алектинибом</h3>
          
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Дата начала лечения</label>
              <input
                type="date"
                name="alectinib_start_date"
                value={formData.alectinib_start_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {renderSelect('stage_at_alectinib_start', 'stage_at_alectinib_start', 'Стадия на момент начала')}

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

        {/* Ответ на терапию */}
        <div className="card">
          <h3>Ответ на терапию алектинибом</h3>
          
          <div className="grid grid-2">
            {renderSelect('first_control_response', 'response', 'Ответ при первом контроле')}
            {renderSelect('second_control_response', 'response', 'Ответ при втором контроле')}
            
            <div className="form-group">
              <label className="form-label">Дата наиболее раннего ответа</label>
              <input
                type="date"
                name="earliest_response_date"
                value={formData.earliest_response_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {formData.cns_metastases && renderSelect('intracranial_response', 'response', 'Интракраниальный ответ')}
          </div>
        </div>

        {/* Прогрессирование */}
        <div className="card">
          <h3>Прогрессирование</h3>
          
          <div className="grid grid-2">
            {renderSelect('progression_during_alectinib', 'progression_type', 'Прогрессирование во время лечения')}
            
            {formData.progression_during_alectinib && formData.progression_during_alectinib !== 'NONE' && (
              <>
                {renderSelect('local_treatment_at_progression', 'local_treatment_at_progression', 'Локальное лечение при прогрессировании')}
                
                <div className="form-group">
                  <label className="form-label">Дата прогрессирования</label>
                  <input
                    type="date"
                    name="progression_date"
                    value={formData.progression_date}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

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
        </div>

        {/* Окончание лечения */}
        <div className="card">
          <h3>Окончание лечения алектинибом</h3>
          
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Дата окончания</label>
              <input
                type="date"
                name="alectinib_end_date"
                value={formData.alectinib_end_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>

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

        {/* Следующая линия */}
        <div className="card">
          <h3>Следующая линия терапии</h3>
          
          {renderMultiSelect('next_line_treatments', 'next_line_treatments', 'Лечение после отмены алектиниба')}
          
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Дата начала следующей линии</label>
              <input
                type="date"
                name="next_line_start_date"
                value={formData.next_line_start_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Дата окончания</label>
              <input
                type="date"
                name="next_line_end_date"
                value={formData.next_line_end_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>

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
              <div className="form-group">
                <label className="form-label">Дата прогрессирования</label>
                <input
                  type="date"
                  name="progression_on_next_line_date"
                  value={formData.progression_on_next_line_date}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
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

        {/* Статус пациента */}
        <div className="card">
          <h3>Текущий статус пациента</h3>
          
          <div className="grid grid-2">
            {renderSelect('current_status', 'current_status', 'Статус')}
            
            <div className="form-group">
              <label className="form-label">
                {formData.current_status === 'умер' ? 'Дата смерти' : 'Дата последнего контакта'}
              </label>
              <input
                type="date"
                name="last_contact_date"
                value={formData.last_contact_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Submit buttons */}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
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
  )
}

export default PatientFormPage
