
import React from 'react'
import './PatientFormSidebar.css'

function PatientFormSidebar({ currentSection, onSectionChange, sections }) {
  return (
    <div className="form-sidebar">
      <div className="sidebar-header">
        <h3>Разделы формы</h3>
      </div>
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
    </div>
  )
}

export default PatientFormSidebar
