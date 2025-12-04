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

  // Определение ОБЯЗАТЕЛЬНЫХ полей для каждого раздела (для логики цвета)
  const requiredFields = {
    'current-status': [
      'current_status', 
    ],
    'patient-basic': [
      'patient_code', 
      'date_filled', 
      'gender', 
      'birth_date', 
      'height', 
      'weight', 
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
    // previous-therapy logic is handled separately below
    'previous-therapy': [], 
    'alectinib-complete': [
      'alectinib_therapy_status',
      'alectinib_start_date', 
      'stage_at_alectinib_start', 
      'ecog_at_start', 
      'metastases_sites', 
      'maximum_response', 
      'progression_during_alectinib'
    ],
    // next-line is conditional
    'next-line': [],
    // ROS1
    'diagnosis-ros1': [
        'initial_diagnosis_date', 
        'tnm_stage', 
        'ros1_fusion_variant', 
        'pdl1_status'
    ],
    'radical-treatment': [
        'radical_treatment_conducted'
    ],
    // metastatic is complex
    'metastatic-therapy': []
  }

  // Все поля для подсчета прогресса (более широкий список)
  const allFields = {
    'current-status': ['current_status', 'last_contact_date'],
    'patient-basic': ['patient_code', 'date_filled', 'gender', 'birth_date', 'height', 'weight', 'comorbidities', 'smoking_status'],
    'diagnosis-alk': ['initial_diagnosis_date', 'tnm_stage', 'histology', 'alk_diagnosis_date', 'alk_methods', 'alk_fusion_variant', 'tp53_comutation', 'ttf1_expression'],
    'previous-therapy': ['had_previous_therapy'],
    'alectinib-complete': ['alectinib_start_date', 'stage_at_alectinib_start', 'ecog_at_start', 'metastases_sites', 'maximum_response', 'progression_during_alectinib', 'cns_metastases'],
    'next-line': ['next_line_treatments'],
    'diagnosis-ros1': ['initial_diagnosis_date', 'tnm_stage', 'ros1_fusion_variant', 'pdl1_status'],
    'radical-treatment': ['radical_treatment_conducted'],
    'metastatic-therapy': ['metastatic_diagnosis_date', 'metastatic_therapy_lines']
  }
  
  // Функция для проверки заполненности поля
  const isFieldFilled = (value) => {
    if (value === null || value === undefined || value === '') return false
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'boolean') return true // булевы поля всегда считаем заполненными, если они не null
    return true
  }

  // Проверка выполнения всех обязательных условий раздела
  const checkRequired = (sectionId) => {
    if (!formData) return false;

    // Special Logic: Previous Therapy
    if (sectionId === 'previous-therapy') {
      if (formData.no_previous_therapy === true) return true;
      if (formData.had_previous_therapy === true) {
        const subReqs = ['previous_therapy_types', 'previous_therapy_start_date', 'previous_therapy_end_date', 'previous_therapy_response', 'previous_therapy_stop_reason'];
        return subReqs.every(f => isFieldFilled(formData[f]));
      }
      return false; // Neither yes nor no selected
    }

    // Special Logic: Radical Treatment (ROS1)
    if (sectionId === 'radical-treatment') {
      if (formData.radical_treatment_conducted === false) return true;
      if (formData.radical_treatment_conducted === true) {
         // If yes, need at least surgery OR crt OR perioperative lines
         const hasSurgery = formData.radical_surgery_conducted === true && isFieldFilled(formData.radical_surgery_date);
         const hasCRT = formData.radical_crt_conducted === true && isFieldFilled(formData.radical_crt_start_date);
         const hasPerio = Array.isArray(formData.radical_perioperative_therapy) && formData.radical_perioperative_therapy.length > 0;
         return hasSurgery || hasCRT || hasPerio;
      }
      return false;
    }

    // Special Logic: Metastatic Therapy (ROS1)
    if (sectionId === 'metastatic-therapy') {
       // Just check if lines exist if applicable? Assuming at least one line if metastatic?
       // Let's keep it simple: just checked filled if in list
       return true; 
    }

    // Special Logic: Next Line (ALK)
    if (sectionId === 'next-line') {
       if (formData.alectinib_therapy_status !== 'STOPPED') return true; // Not required if ongoing
       // If stopped, check next line fields
       if (isFieldFilled(formData.next_line_treatments)) {
          // If treatment selected, need dates
          return isFieldFilled(formData.next_line_start_date);
       }
       // It's acceptable to have stopped but not started next line yet? 
       // Assuming purely filled fields for now.
       return true;
    }

    const reqs = requiredFields[sectionId] || [];
    if (reqs.length === 0) return true; // No strict requirements defined

    return reqs.every(field => isFieldFilled(formData[field]));
  }
  
  // Расчет процента заполненности (для бейджика)
  const calculateCompletion = (sectionId) => {
    if (!formData) return 0
    
    // Специальная логика для процентов (как раньше)
    if (sectionId === 'previous-therapy') {
        if (formData.no_previous_therapy === true) return 100;
        if (formData.had_previous_therapy === true) {
            const subfields = ['previous_therapy_types', 'previous_therapy_start_date', 'previous_therapy_response'];
            const filledSub = subfields.filter(f => isFieldFilled(formData[f])).length;
            return Math.round((filledSub / subfields.length) * 100);
        }
        return 0; 
    }

    const fields = allFields[sectionId] || []
    if (fields.length === 0) return 0

    const filledCount = fields.filter(field => isFieldFilled(formData[field])).length
    return Math.round((filledCount / fields.length) * 100)
  }
  
  // Получение CSS класса для цветовой индикации
  const getCompletionClass = (sectionId) => {
    const percentage = calculateCompletion(sectionId);
    
    // 1. Если 0% -> Желтый (не начато / частично)
    // Поправка: Пользователь просил "желтый, если не открывал ни разу".
    // Технически 0% - это и есть "не заполнено".
    if (percentage === 0) return 'completion-medium'; 

    // 2. Проверяем обязательные поля
    const isComplete = checkRequired(sectionId);

    if (isComplete) {
        return 'completion-high'; // Зеленый
    } else {
        return 'completion-low'; // Красный (есть данные, но не все обязательные)
    }
  }

  const renderNavButton = (section, isGroupedItem = false) => {
    const completion = calculateCompletion(section.id)
    const completionClass = getCompletionClass(section.id)
    
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
        {/* {completion > 0 && <span className="completion-badge">{completion}%</span>} */}
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