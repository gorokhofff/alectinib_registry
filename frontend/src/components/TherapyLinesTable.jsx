import React, { useState } from 'react'
import TherapyBuilder from './TherapyBuilder'
import DateValidation from './DateValidation'
import styles from './TherapyLinesTable.module.css'

/**
 * TherapyLinesTable Component
 * 
 * Компонент для управления таблицей линий терапии (для регистра ROS1)
 * 
 * @param {Array} value - Массив линий терапии [{line_number, therapy, start_date, end_date, response, stop_reason}]
 * @param {Function} onChange - Callback при изменении линий
 * @param {Boolean} disabled - Отключить редактирование
 * @param {Object} dictionaries - Справочники для select'ов
 * @param {Date} minStartDate - Минимальная дата начала первой линии (для валидации)
 */
function TherapyLinesTable({ value = [], onChange, disabled = false, dictionaries = {}, minStartDate = null }) {
  const [expandedLines, setExpandedLines] = useState([0]) // Первая линия развернута по умолчанию

  const handleAddLine = () => {
    const newLine = {
      line_number: value.length + 1,
      therapy: null,
      start_date: '',
      end_date: '',
      response: '',
      stop_reason: ''
    }
    const updated = [...value, newLine]
    onChange(updated)
    setExpandedLines([...expandedLines, value.length])
  }

  const handleRemoveLine = (index) => {
    const updated = value.filter((_, i) => i !== index)
    // Пересчитать номера линий
    updated.forEach((line, i) => {
      line.line_number = i + 1
    })
    onChange(updated)
    setExpandedLines(expandedLines.filter(i => i !== index).map(i => i > index ? i - 1 : i))
  }

  const handleLineChange = (index, field, fieldValue) => {
    const updated = [...value]
    updated[index] = {
      ...updated[index],
      [field]: fieldValue
    }
    onChange(updated)
  }

  const toggleExpand = (index) => {
    if (expandedLines.includes(index)) {
      setExpandedLines(expandedLines.filter(i => i !== index))
    } else {
      setExpandedLines([...expandedLines, index])
    }
  }

  const validateDates = (line, index) => {
    const errors = []
    
    // Проверка: дата окончания >= дата начала
    if (line.start_date && line.end_date) {
      if (new Date(line.end_date) < new Date(line.start_date)) {
        errors.push('Дата окончания не может быть раньше даты начала')
      }
    }
    
    // Проверка: дата начала 1-й линии >= minStartDate
    if (index === 0 && line.start_date && minStartDate) {
      if (new Date(line.start_date) < new Date(minStartDate)) {
        errors.push(`Дата начала должна быть не раньше ${new Date(minStartDate).toLocaleDateString('ru-RU')}`)
      }
    }
    
    // Проверка: дата начала следующей линии >= дата окончания предыдущей
    if (index > 0 && line.start_date && value[index - 1].end_date) {
      if (new Date(line.start_date) < new Date(value[index - 1].end_date)) {
        errors.push('Дата начала должна быть не раньше окончания предыдущей линии')
      }
    }
    
    return errors
  }

  const getLineCompletion = (line) => {
    let completed = 0
    const total = 6 // therapy, start_date, end_date, response, stop_reason + номер (всегда заполнен)
    
    if (line.therapy && line.therapy.therapy_class) completed++
    if (line.start_date) completed++
    if (line.end_date) completed++
    if (line.response) completed++
    if (line.stop_reason) completed++
    
    return Math.round((completed / (total - 1)) * 100)
  }

  const responseOptions = dictionaries.response || []
  const stopReasonOptions = dictionaries.therapy_stop_reason || dictionaries.alectinib_stop_reason || []

  return (
    <div className={styles.therapyLinesTable}>
      <div className={styles.tableHeader}>
        <h4>Линии терапии метастатического процесса</h4>
        <button
          type="button"
          onClick={handleAddLine}
          disabled={disabled}
          className={styles.addButton}
        >
          + Добавить линию
        </button>
      </div>

      {value.length === 0 && (
        <div className={styles.emptyState}>
          <p>Линии терапии не добавлены</p>
          <button
            type="button"
            onClick={handleAddLine}
            disabled={disabled}
            className={styles.addButtonLarge}
          >
            + Добавить первую линию
          </button>
        </div>
      )}

      <div className={styles.linesContainer}>
        {value.map((line, index) => {
          const isExpanded = expandedLines.includes(index)
          const dateErrors = validateDates(line, index)
          const completion = getLineCompletion(line)

          return (
            <div key={index} className={`${styles.lineCard} ${isExpanded ? styles.expanded : ''}`}>
              <div className={styles.lineHeader} onClick={() => toggleExpand(index)}>
                <div className={styles.lineTitle}>
                  <span className={styles.lineNumber}>Линия {line.line_number}</span>
                  <span className={styles.lineCompletion}>{completion}%</span>
                </div>
                <div className={styles.lineActions}>
                  {value.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveLine(index)
                      }}
                      disabled={disabled}
                      className={styles.removeButton}
                      title="Удалить линию"
                    >
                      ✕
                    </button>
                  )}
                  <span className={styles.expandIcon}>
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className={styles.lineContent}>
                  {/* Therapy Selection */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Режим терапии *</label>
                    <TherapyBuilder
                      value={line.therapy}
                      onChange={(therapy) => handleLineChange(index, 'therapy', therapy)}
                      disabled={disabled}
                      required={true}
                    />
                  </div>

                  {/* Dates */}
                  <div className={styles.gridTwo}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Дата начала *</label>
                      <input
                        type="date"
                        value={line.start_date}
                        onChange={(e) => handleLineChange(index, 'start_date', e.target.value)}
                        disabled={disabled}
                        className={styles.formInput}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Дата окончания</label>
                      <input
                        type="date"
                        value={line.end_date}
                        onChange={(e) => handleLineChange(index, 'end_date', e.target.value)}
                        disabled={disabled}
                        className={styles.formInput}
                      />
                    </div>
                  </div>

                  {/* Date Validation Errors */}
                  {dateErrors.length > 0 && (
                    <div className={styles.validationErrors}>
                      {dateErrors.map((error, i) => (
                        <div key={i} className={styles.errorMessage}>
                          ⚠️ {error}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Response and Stop Reason */}
                  <div className={styles.gridTwo}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Эффект терапии</label>
                      <select
                        value={line.response}
                        onChange={(e) => handleLineChange(index, 'response', e.target.value)}
                        disabled={disabled}
                        className={styles.formSelect}
                      >
                        <option value="">Выберите...</option>
                        {responseOptions.map(opt => (
                          <option key={opt.id} value={opt.code}>
                            {opt.value_ru}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Причина отмены</label>
                      <select
                        value={line.stop_reason}
                        onChange={(e) => handleLineChange(index, 'stop_reason', e.target.value)}
                        disabled={disabled}
                        className={styles.formSelect}
                      >
                        <option value="">Выберите...</option>
                        {stopReasonOptions.map(opt => (
                          <option key={opt.id} value={opt.code}>
                            {opt.value_ru}
                          </option>
                        ))}
                      </select>
                    </div>
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
