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

  const renderNavButton = (section, isGroupedItem = false) => {
    const statusClass = section.status ? `status-${section.status}` : '';
    return (
      <button
        key={section.id}
        className={`nav-item ${isGroupedItem ? 'nav-item-grouped' : ''} ${currentSection === section.id ? 'active' : ''} ${statusClass}`}
        onClick={() => onSectionChange(section.id)}
      >
        <span className="nav-icon">{section.icon}</span>
        <span className="nav-label">{section.title}</span>
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