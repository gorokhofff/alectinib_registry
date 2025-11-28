import React, { useState } from 'react'
import './PatientFormSidebar.css'

/**
 * PatientFormSidebar Component
 * 
 * Сайдбар для навигации по разделам формы пациента
 * Поддерживает как плоскую структуру (ALK), так и группированную (ROS1)
 * 
 * @param {String} currentSection - ID текущего раздела
 * @param {Function} onSectionChange - Callback при смене раздела
 * @param {Array} sections - Плоская структура разделов (для ALK)
 * @param {Array} structure - Группированная структура [{groupTitle, sections: [...]}] (для ROS1)
 * @param {Object} formData - Данные формы для расчета прогресса
 */
function PatientFormSidebar({ currentSection, onSectionChange, sections = [], structure = null, formData = {} }) {
  const [collapsedGroups, setCollapsedGroups] = useState([])

  const toggleGroup = (groupIndex) => {
    if (collapsedGroups.includes(groupIndex)) {
      setCollapsedGroups(collapsedGroups.filter(i => i !== groupIndex))
    } else {
      setCollapsedGroups([...collapsedGroups, groupIndex])
    }
  }

  // Если передана иерархическая структура, используем её (для ROS1)
  const isGrouped = structure && structure.length > 0

  // Рендерим плоскую структуру (ALK)
  const renderFlatSections = () => (
    <nav className="sidebar-nav">
      {sections.map((section) => (
        <button
          key={section.id}
          className={`nav-item ${currentSection === section.id ? 'active' : ''}`}
          onClick={() => onSectionChange(section.id)}
        >
          <span className="nav-icon">{section.icon}</span>
          <span className="nav-label">{section.title}</span>
        </button>
      ))}
    </nav>
  )

  // Рендерим группированную структуру (ROS1)
  const renderGroupedSections = () => (
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
              <span className={`nav-group-icon ${isCollapsed ? 'collapsed' : 'expanded'}`}>
                ▼
              </span>
            </button>
            
            {!isCollapsed && (
              <div className="nav-group-sections">
                {group.sections.map((section) => (
                  <button
                    key={section.id}
                    className={`nav-item nav-item-grouped ${currentSection === section.id ? 'active' : ''}`}
                    onClick={() => onSectionChange(section.id)}
                  >
                    <span className="nav-icon">{section.icon}</span>
                    <span className="nav-label">{section.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )

  return (
    <div className="form-sidebar">
      <div className="sidebar-header">
        <h3>Разделы формы</h3>
      </div>
      {isGrouped ? renderGroupedSections() : renderFlatSections()}
    </div>
  )
}

export default PatientFormSidebar
