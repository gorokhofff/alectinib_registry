import React from 'react'
import './PatientFormSidebar.css'

function PatientFormSidebar({ currentSection, onSectionChange, sections, formData }) {
  // Calculate completion percentage for each section
  const calculateCompletion = (sectionId) => {
    if (!formData) return 0

    const sectionFields = {
      'current-status': ['current_status', 'last_contact_date'],
      'patient-basic': ['patient_code', 'date_filled', 'gender', 'birth_date', 'height', 'weight', 'comorbidities', 'smoking_status'],
      'diagnosis-alk': ['initial_diagnosis_date', 'tnm_stage', 'histology', 'alk_diagnosis_date', 'alk_methods', 'alk_fusion_variant', 'tp53_comutation', 'ttf1_expression'],
      'previous-therapy': ['had_previous_therapy', 'no_previous_therapy', 'previous_therapy_types', 'previous_therapy_start_date', 'previous_therapy_end_date', 'previous_therapy_response'],
      'alectinib-complete': ['alectinib_start_date', 'stage_at_alectinib_start', 'alectinib_therapy_status', 'ecog_at_start', 'metastases_sites', 'maximum_response', 'progression_during_alectinib'],
      'next-line': ['next_line_treatments', 'next_line_start_date', 'progression_on_next_line']
    }

    const fields = sectionFields[sectionId] || []
    if (fields.length === 0) return 0

    const filledCount = fields.filter(field => {
      const value = formData[field]
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'boolean') return true
      return value !== null && value !== undefined && value !== ''
    }).length

    return Math.round((filledCount / fields.length) * 100)
  }

  const getCompletionColor = (percentage) => {
    if (percentage === 0) return ''
    if (percentage < 70) return 'completion-red'
    if (percentage < 90) return 'completion-yellow'
    return 'completion-green'
  }

  return (
    <div className="form-sidebar">
      <div className="sidebar-header">
        <h3>Разделы формы</h3>
      </div>
      <nav className="sidebar-nav">
        {sections.map((section) => {
          const completion = calculateCompletion(section.id)
          const colorClass = getCompletionColor(completion)

          return (
            <button
              key={section.id}
              className={`nav-item ${currentSection === section.id ? 'active' : ''} ${colorClass}`}
              onClick={() => onSectionChange(section.id)}
            >
              <span className="nav-icon">{section.icon}</span>
              <span className="nav-label">{section.title}</span>
              {formData && <span className="nav-completion">{completion}%</span>}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default PatientFormSidebar