import React, { useState } from 'react'
import './PatientFormSidebar.css'

function PatientFormSidebar({ currentSection, onSectionChange, sections = [], structure = null, formData = {} }) {
  const [collapsedGroups, setCollapsedGroups] = useState([])

  const toggleGroup = (groupIndex) => {
    if (collapsedGroups.includes(groupIndex)) {
      setCollapsedGroups(collapsedGroups.filter(i => i !== groupIndex))
    } else {
      setCollapsedGroups([...collapsedGroups, groupIndex])
    }
  }

  // Определение полей для каждого раздела
  const sectionFields = {
    'current-status': [
      'current_status', 
      'last_contact_date'
    ],
    'patient-basic': [
      'patient_code', 
      'date_filled', 
      'gender', 
      'birth_date', 
      'height', 
      'weight', 
      'comorbidities', 
      'smoking_status'
    ],
    'diagnosis-alk': [
      'initial_diagnosis_date', 
      'tnm_stage', 
      'histology', 
      'alk_diagnosis_date', 
      'alk_methods', 
      'alk_fusion_variant', 
      'tp53_comutation', 
      'ttf1_expression'
    ],
    'previous-therapy': [
      'had_previous_therapy', 
    ],
    'alectinib-complete': [
      'alectinib_start_date', 
      'stage_at_alectinib_start', 
      'ecog_at_start', 
      'metastases_sites', 
      'maximum_response', 
      'progression_during_alectinib'
    ],
    'next-line': [
      'next_line_treatments', 
      'next_line_start_date', 
      'progression_on_next_line'
    ],
    // ROS1 Updated mapping
    'diagnosis-ros1': [
        'initial_diagnosis_date', 
        'tnm_stage', 
        'ros1_fusion_variant', 
        'pdl1_status'
    ],
    'radical-treatment': [
        'radical_treatment_conducted',
        'radical_perioperative_therapy' // Array field
    ],
    'metastatic-therapy': [
        'metastatic_diagnosis_date',
        'metastatic_therapy_lines' // Array field
    ]
  }
  
  // Функция для проверки заполненности поля
  const isFieldFilled = (value) => {
    if (value === null || value === undefined || value === '') return false
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'boolean') return true // булевы поля всегда считаем заполненными
    return true
  }
  
  // Расчет процента заполненности раздела
  const calculateCompletion = (sectionId) => {
    if (!formData) return 0
    
    // Специальная логика для previous therapy
    if (sectionId === 'previous-therapy') {
        if (formData.no_previous_therapy === true) return 100;
        if (formData.had_previous_therapy === true) {
            const subfields = ['previous_therapy_types', 'previous_therapy_start_date', 'previous_therapy_response'];
            const filledSub = subfields.filter(f => isFieldFilled(formData[f])).length;
            return Math.round((filledSub / subfields.length) * 100);
        }
        return 0; 
    }

    // Специальная логика для Radical Treatment (ROS1)
    if (sectionId === 'radical-treatment') {
        if (formData.radical_treatment_conducted === false) return 100; // Лечение не проводилось - раздел заполнен
    }

    const fields = sectionFields[sectionId] || []
    if (fields.length === 0) return 0

    const filledCount = fields.filter(field => isFieldFilled(formData[field])).length
    return Math.round((filledCount / fields.length) * 100)
  }
  
  // Получение CSS класса для цветовой индикации
  const getCompletionClass = (percentage) => {
    if (percentage === 0) return ''
    if (percentage > 90) return 'completion-high' // Green
    if (percentage >= 50) return 'completion-medium' // Yellow
    return 'completion-low' // Red
  }

  const renderNavButton = (section, isGroupedItem = false) => {
    const completion = calculateCompletion(section.id)
    const completionClass = getCompletionClass(completion)
    
    return (
      <button
        key={section.id}
        className={`nav-item ${isGroupedItem ? 'nav-item-grouped' : ''} ${currentSection === section.id ? 'active' : ''} ${completionClass}`}
        onClick={() => onSectionChange(section.id)}
      >
        <div className="nav-item-content">
            <span className="nav-icon">{section.icon}</span>
            <span className="nav-label">{section.title}</span>
        </div>
      </button>
    )
  }

  const isGrouped = structure && structure.length > 0

  return (
    <div className="form-sidebar">
      <div className="sidebar-header">
        <h3>Разделы формы</h3>
      </div>
      
      {isGrouped ? (
        <nav className="sidebar-nav sidebar-nav-grouped">
          {structure.map((group, groupIndex) => {
            const isCollapsed = collapsedGroups.includes(groupIndex)
            return (
              <div key={groupIndex} className="nav-group">
                <button
                  className="nav-group-header"
                  onClick={() => toggleGroup(groupIndex)}
                >
                  <span className="nav-group-title">{group.groupTitle}</span>
                  <span className={`nav-group-icon ${isCollapsed ? 'collapsed' : 'expanded'}`}>▼</span>
                </button>
                {!isCollapsed && (
                  <div className="nav-group-sections">
                    {group.sections.map((section) => renderNavButton(section, true))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      ) : (
        <nav className="sidebar-nav">
          {sections.map((section) => renderNavButton(section))}
        </nav>
      )}
    </div>
  )
}

export default PatientFormSidebar