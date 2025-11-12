
import React, { useState, useEffect } from 'react'
import './DateValidation.css'

function DateValidation({ 
  name, 
  label, 
  value, 
  onChange, 
  validationRules = [], 
  otherDates = {},
  required = false,
  tooltip
}) {
  const [error, setError] = useState('')
  const [isValid, setIsValid] = useState(true)

  useEffect(() => {
    validateDate(value)
  }, [value, otherDates])

  const toDateOnly = (dateStr) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  const validateDate = (dateValue) => {
    if (!dateValue) {
      setError('')
      setIsValid(true)
      return true
    }

  const currentDate = toDateOnly(dateValue)
  let errorMessage = ''

    for (const rule of validationRules) {
      const compareDateRaw = otherDates[rule.compareWith]
      const compareDateTime = toDateOnly(compareDateRaw)

      if (!compareDateTime) continue

      if (rule.type === 'before' && currentDate < compareDateTime) {
        errorMessage = rule.message
        break
      }
      if (rule.type === 'after' && currentDate > compareDateTime) {
        errorMessage = rule.message
        break
      }
    }

    setError(errorMessage)
    setIsValid(!errorMessage)
    return !errorMessage
  }
  // const validateDate = (dateValue) => {
  //   if (!dateValue) {
  //     setError('')
  //     setIsValid(true)
  //     return true
  //   }

  //   const currentDate = new Date(dateValue)
  //   let errorMessage = ''

  //   // Check validation rules
  //   for (const rule of validationRules) {
  //     const compareDate = otherDates[rule.compareWith]
  //     if (compareDate) {
  //       const compareDateTime = new Date(compareDate)
        
  //       if (rule.type === 'before' && currentDate >= compareDateTime) {
  //         errorMessage = rule.message
  //         break
  //       }
  //       if (rule.type === 'after' && currentDate <= compareDateTime) {
  //         errorMessage = rule.message
  //         break
  //       }
  //     }
  //   }

  const handleChange = (e) => {
    const newValue = e.target.value
    onChange(e)
    validateDate(newValue)
  }

  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required">*</span>}
          {tooltip && (
            <span className="date-tooltip" title={tooltip}>
              ℹ️
            </span>
          )}
        </label>
      )}
      <input
        type="date"
        name={name}
        value={value}
        onChange={handleChange}
        className={`form-input ${!isValid ? 'error' : ''}`}
        required={required}
        title={tooltip}
      />
      {tooltip && !label && (
        <div className="date-hint">
          <span className="hint-icon">ℹ️</span>
          {tooltip}
        </div>
      )}
      {error && (
        <div className="validation-error">
          {error}
        </div>
      )}
    </div>
  )
}

export default DateValidation
