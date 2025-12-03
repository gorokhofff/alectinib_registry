import React, { useState } from 'react'
import TherapyBuilder from './TherapyBuilder'
import styles from './TherapyLinesTable.module.css'

function TherapyLinesTable({ value = [], onChange, disabled = false, dictionaries = {}, minStartDate = null }) {
  const [expandedLines, setExpandedLines] = useState([0])

  const handleAddLine = () => {
    const newLine = {
      line_number: value.length + 1,
      therapy: null,
      start_date: '',
      end_date: '',
      response: '',
      stop_reason: '',
      // Прогрессирование
      progression_date: '',
      progression_type: '',
      progression_sites: [],
      progression_sites_other: '',
      // Локальное лечение
      local_treatment_at_progression: '',
      local_treatment_response: ''
    }
    const updated = [...value, newLine]
    onChange(updated)
    setExpandedLines([...expandedLines, value.length])
  }

  const handleRemoveLine = (index) => {
    const updated = value.filter((_, i) => i !== index)
    updated.forEach((line, i) => { line.line_number = i + 1 })
    onChange(updated)
  }

  const handleLineChange = (index, field, fieldValue) => {
    const updated = [...value]
    updated[index] = { ...updated[index], [field]: fieldValue }
    onChange(updated)
  }

  const handleMultiSelect = (index, field, optionValue) => {
    const currentValues = value[index][field] || []
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter(v => v !== optionValue)
      : [...currentValues, optionValue]
    handleLineChange(index, field, newValues)
  }

  const toggleExpand = (index) => {
    setExpandedLines(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index])
  }

  const responseOptions = dictionaries.response || []
  const stopReasonOptions = dictionaries.alectinib_stop_reason || []
  const progressionTypeOptions = dictionaries.progression_type || []
  const progressionSitesOptions = dictionaries.progression_sites || []
  const localTreatmentOptions = dictionaries.local_treatment_at_progression || [] 

  return (
    <div className={styles.therapyLinesTable}>
      <div className={styles.tableHeader}>
        <h4>Линии терапии метастатического процесса</h4>
        <button type="button" onClick={handleAddLine} disabled={disabled} className={styles.addButton}>+ Добавить линию</button>
      </div>

      {value.length === 0 && (
        <div className={styles.emptyState}>
          <p>Линии терапии не добавлены</p>
          <button type="button" onClick={handleAddLine} disabled={disabled} className={styles.addButtonLarge}>+ Добавить первую линию</button>
        </div>
      )}

      <div className={styles.linesContainer}>
        {value.map((line, index) => {
          const isExpanded = expandedLines.includes(index)
          // Условие показа локального лечения: OLIGO или ЦНС
          const showLocalTreatment = 
            line.progression_type === 'OLIGO' || 
            (line.progression_sites && line.progression_sites.includes('CNS'));

          // Валидация дат
          const dateError = line.start_date && line.end_date && new Date(line.start_date) > new Date(line.end_date) 
            ? 'Дата окончания раньше начала' 
            : null;
          
          const progDateError = line.start_date && line.progression_date && new Date(line.progression_date) < new Date(line.start_date)
            ? 'Дата прогрессирования раньше начала лечения'
            : null;

          return (
            <div key={index} className={`${styles.lineCard} ${isExpanded ? styles.expanded : ''}`}>
              <div className={styles.lineHeader} onClick={() => toggleExpand(index)}>
                <div className={styles.lineTitle}><span className={styles.lineNumber}>Линия {line.line_number}</span></div>
                <div className={styles.lineActions}>
                  {value.length > 1 && <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveLine(index); }} disabled={disabled} className={styles.removeButton}>✕</button>}
                  <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className={styles.lineContent}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Режим терапии *</label>
                    <TherapyBuilder value={line.therapy} dictionaries={dictionaries} onChange={(therapy) => handleLineChange(index, 'therapy', therapy)} disabled={disabled} required={true} />
                  </div>

                  <div className={styles.gridTwo}>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Дата начала *</label><input type="date" value={line.start_date} onChange={(e) => handleLineChange(index, 'start_date', e.target.value)} disabled={disabled} className={styles.formInput} required /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Дата окончания</label><input type="date" value={line.end_date} onChange={(e) => handleLineChange(index, 'end_date', e.target.value)} disabled={disabled} className={`${styles.formInput} ${dateError ? 'error' : ''}`} /></div>
                  </div>
                  {dateError && <div style={{color: 'red', fontSize: '12px', marginTop: '-10px', marginBottom: '10px'}}>{dateError}</div>}

                  <div className={styles.gridTwo}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Эффект терапии</label>
                      <select value={line.response} onChange={(e) => handleLineChange(index, 'response', e.target.value)} disabled={disabled} className={styles.formSelect}>
                        <option value="">Выберите...</option>
                        {responseOptions.map(opt => <option key={opt.code} value={opt.code}>{opt.value_ru}</option>)}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Причина отмены</label>
                      <select value={line.stop_reason} onChange={(e) => handleLineChange(index, 'stop_reason', e.target.value)} disabled={disabled} className={styles.formSelect}>
                        <option value="">Выберите...</option>
                        {stopReasonOptions.map(opt => <option key={opt.code} value={opt.code}>{opt.value_ru}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* --- БЛОК ПРОГРЕССИРОВАНИЯ --- */}
                  <div className={styles.subsection} style={{marginTop: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '6px'}}>
                    <h5 style={{marginTop: 0, marginBottom: '10px', fontSize: '14px', color: '#555'}}>Данные о прогрессировании</h5>
                    
                    <div className={styles.gridTwo}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Дата прогрессирования</label>
                            <input type="date" value={line.progression_date} onChange={(e) => handleLineChange(index, 'progression_date', e.target.value)} className={`${styles.formInput} ${progDateError ? 'error' : ''}`} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Тип прогрессирования</label>
                            <select value={line.progression_type} onChange={(e) => handleLineChange(index, 'progression_type', e.target.value)} className={styles.formSelect}>
                                <option value="">Выберите...</option>
                                {progressionTypeOptions.map(opt => <option key={opt.code} value={opt.code}>{opt.value_ru}</option>)}
                            </select>
                        </div>
                    </div>
                    {progDateError && <div style={{color: 'red', fontSize: '12px', marginTop: '-10px', marginBottom: '10px'}}>{progDateError}</div>}
                    
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Локализация прогрессирования</label>
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                            {progressionSitesOptions.map(opt => (
                                <label key={opt.code} style={{display: 'flex', alignItems: 'center', fontSize: '13px'}}>
                                    <input 
                                        type="checkbox" 
                                        checked={(line.progression_sites || []).includes(opt.code)} 
                                        onChange={() => handleMultiSelect(index, 'progression_sites', opt.code)}
                                        style={{marginRight: '5px'}}
                                    />
                                    {opt.value_ru}
                                </label>
                            ))}
                        </div>
                    </div>
                    
                    {(line.progression_sites || []).includes('OTHER') && (
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Уточните локализацию</label>
                            <input type="text" value={line.progression_sites_other} onChange={(e) => handleLineChange(index, 'progression_sites_other', e.target.value)} className={styles.formInput} />
                        </div>
                    )}

                    {/* Локальное лечение (Появляется при OLIGO или CNS) */}
                    {showLocalTreatment && (
                        <div className="gridTwo" style={{marginTop: 10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Локальное лечение</label>
                                <select value={line.local_treatment_at_progression} onChange={(e) => handleLineChange(index, 'local_treatment_at_progression', e.target.value)} className={styles.formSelect}>
                                    <option value="">Выберите...</option>
                                    {localTreatmentOptions.map(opt => <option key={opt.code} value={opt.code}>{opt.value_ru}</option>)}
                                </select>
                            </div>
                            
                            {/* Поле для результата локального лечения */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Результат лок. лечения</label>
                                <select value={line.local_treatment_response} onChange={(e) => handleLineChange(index, 'local_treatment_response', e.target.value)} className={styles.formSelect}>
                                    <option value="">Выберите...</option>
                                    {responseOptions.map(opt => <option key={opt.code} value={opt.code}>{opt.value_ru}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TherapyLinesTable