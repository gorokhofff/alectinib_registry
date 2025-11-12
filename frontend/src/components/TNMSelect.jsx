
import React, { useState, useEffect } from 'react'
import './TNMSelect.css'

function TNMSelect({ name, value, onChange, options = [], label, required = false }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [filteredOptions, setFilteredOptions] = useState(options)

  useEffect(() => {
    const filtered = options.filter(option =>
      option.value_ru.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredOptions(filtered)
  }, [searchTerm, options])

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setIsOpen(true)
  }

  const handleSelect = (option) => {
    onChange({
      target: {
        name: name,
        value: option.code
      }
    })
    setSearchTerm(option.value_ru)
    setIsOpen(false)
  }

  const handleInputClick = () => {
    setIsOpen(!isOpen)
  }

  // Set search term when value changes externally
  useEffect(() => {
    if (value) {
      const selectedOption = options.find(opt => opt.code === value)
      if (selectedOption) {
        setSearchTerm(selectedOption.value_ru)
      }
    } else {
      setSearchTerm('')
    }
  }, [value, options])

  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      <div className="tnm-select-container">
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearch}
          onClick={handleInputClick}
          className="form-input tnm-search"
          placeholder="Начните вводить TNM стадию (например, T2)"
          autoComplete="off"
        />
        {isOpen && filteredOptions.length > 0 && (
          <div className="tnm-dropdown">
            {filteredOptions.slice(0, 10).map(option => (
              <div
                key={option.id}
                className="tnm-option"
                onClick={() => handleSelect(option)}
              >
                {option.value_ru}
              </div>
            ))}
            {filteredOptions.length > 10 && (
              <div className="tnm-more">
                И еще {filteredOptions.length - 10} вариантов...
              </div>
            )}
          </div>
        )}
        {isOpen && filteredOptions.length === 0 && searchTerm && (
          <div className="tnm-dropdown">
            <div className="tnm-no-results">Нет совпадений</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TNMSelect
