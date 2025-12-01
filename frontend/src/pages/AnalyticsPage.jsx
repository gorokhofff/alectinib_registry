import React, { useState, useEffect } from 'react'
import { analyticsService } from '../services/analyticsService'
import { useRegistry } from '../contexts/RegistryContext'
import './AnalyticsPage.css'

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { registryType } = useRegistry()

  useEffect(() => {
    loadAnalytics()
  }, [registryType]) 

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      // Передаем registry_type в запрос
      const data = await analyticsService.getAnalytics({ registry_type: registryType })
      setAnalytics(data)
    } catch (err) {
      setError('Ошибка загрузки аналитики')
    } finally {
      setLoading(false)
    }
  }

  const getCompletionColor = (rate) => {
    if (rate >= 80) return 'var(--success-color)'
    if (rate >= 50) return '#f59e0b'
    return 'var(--danger-color)'
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  const totalPatients = analytics.reduce((sum, inst) => sum + inst.total_patients, 0)

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h2>Аналитическая справка ({registryType})</h2>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-label">Всего пациентов</div>
          <div className="summary-value">{totalPatients}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Учреждений</div>
          <div className="summary-value">{analytics.length}</div>
        </div>
      </div>

      {analytics.map((inst) => (
        <div key={inst.institution_id} className="card analytics-card">
          <div className="institution-header">
            <h3>{inst.institution_name}</h3>
            <div className="patient-count">
              Пациентов: <strong>{inst.total_patients}</strong>
            </div>
          </div>

          {inst.total_patients > 0 && (
            <div className="field-completion">
              <h4>Процент заполнения полей</h4>
              <div className="completion-grid">
                {Object.entries(inst.field_completion_rates).map(([field, rate]) => (
                  <div key={field} className="completion-item">
                    <div className="completion-label">{getFieldLabel(field)}</div>
                    <div className="completion-bar-container">
                      <div 
                        className="completion-bar"
                        style={{
                          width: `${rate}%`,
                          backgroundColor: getCompletionColor(rate)
                        }}
                      />
                    </div>
                    <div className="completion-value">{rate}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function getFieldLabel(field) {
  const labels = {
    // Общие
    gender: 'Пол',
    birth_date: 'Дата рождения',
    height: 'Рост',
    weight: 'Вес',
    initial_diagnosis_date: 'Дата диагноза',
    tnm_stage: 'Стадия TNM',
    histology: 'Гистология',
    current_status: 'Текущий статус',
    last_contact_date: 'Дата последнего контакта',
    
    // ALK
    alk_diagnosis_date: 'Дата ALK диагностики',
    alk_methods: 'Методы ALK',
    alectinib_start_date: 'Начало алектиниба',
    ecog_at_start: 'ECOG статус',
    
    // ROS1 (Новые поля)
    ros1_fusion_variant: 'Вариант транслокации ROS1',
    pdl1_status: 'PD-L1 статус',
    radical_treatment_conducted: 'Радикальное лечение (Да/Нет)',
    metastatic_diagnosis_date: 'Дата метастатической стадии'
  }
  return labels[field] || field
}

export default AnalyticsPage