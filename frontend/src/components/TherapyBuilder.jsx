import React, { useState, useEffect, useMemo } from 'react'
import { dictionaryService } from '../services/dictionaryService'
import styles from './TherapyBuilder.module.css'

/**
 * TherapyBuilder - компонент для выбора терапии
 * 
 * @param {Object} props
 * @param {Object} props.value - Текущее значение { therapy_class, regimen_code, custom_drugs }
 * @param {Function} props.onChange - Callback для изменения значения
 * @param {boolean} props.disabled - Отключить компонент
 * @param {boolean} props.required - Обязательное поле
 * @param {string} props.label - Метка компонента
 * @param {Object} props.errors - Объект с ошибками валидации
 */
const TherapyBuilder = ({ 
  value = {}, 
  onChange, 
  disabled = false, 
  required = false, 
  label = 'Терапия',
  errors = {}
}) => {
  // State для выбранных значений
  const [selectedClass, setSelectedClass] = useState(value?.therapy_class || '')
  const [selectedRegimen, setSelectedRegimen] = useState(value?.regimen_code || '')
  const [selectedDrugs, setSelectedDrugs] = useState(value?.custom_drugs || [])
  
  // State для справочников
  const [classes, setClasses] = useState([])
  const [regimens, setRegimens] = useState([])
  const [drugs, setDrugs] = useState([])
  
  // State для загрузки и ошибок
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  
  // State для валидации
  const [validationErrors, setValidationErrors] = useState({})

  // Загрузка справочников при монтировании
  useEffect(() => {
    loadDictionaries()
  }, [])

  // Синхронизация с внешним value
  useEffect(() => {
    if (value) {
      setSelectedClass(value.therapy_class || '')
      setSelectedRegimen(value.regimen_code || '')
      setSelectedDrugs(value.custom_drugs || [])
    }
  }, [value])

  // Валидация и вызов onChange
  useEffect(() => {
    const errors = validate()
    setValidationErrors(errors)
    
    if (onChange) {
      onChange({
        therapy_class: selectedClass,
        regimen_code: selectedRegimen,
        custom_drugs: selectedDrugs
      }, errors)
    }
  }, [selectedClass, selectedRegimen, selectedDrugs])

  /**
   * Загрузка справочников
   */
  const loadDictionaries = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      
      const [classesData, regimensData, drugsData] = await Promise.all([
        dictionaryService.getDictionaries('therapy_classes'),
        dictionaryService.getDictionaries('treatment_regimens'),
        dictionaryService.getDictionaries('chemo_drugs')
      ])
      
      setClasses(classesData || [])
      setRegimens(regimensData || [])
      setDrugs(drugsData || [])
    } catch (error) {
      console.error('Ошибка загрузки справочников:', error)
      setLoadError('Не удалось загрузить справочники')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Фильтрация схем по выбранному классу
   */
  const filteredRegimens = useMemo(() => {
    if (!selectedClass) return []
    return regimens.filter(
      r => r.parent === selectedClass || r.parent === 'ALL'
    )
  }, [regimens, selectedClass])

  /**
   * Валидация полей
   */
  const validate = () => {
    const errors = {}
    
    if (required && !selectedClass) {
      errors.therapy_class = 'Выберите класс терапии'
    }
    
    if (selectedClass && !selectedRegimen) {
      errors.regimen_code = 'Выберите схему терапии'
    }
    
    if (selectedRegimen === 'OTHER_REGIMEN' && (!selectedDrugs || selectedDrugs.length === 0)) {
      errors.custom_drugs = 'Выберите хотя бы один препарат'
    }
    
    return errors
  }

  /**
   * Обработчик изменения класса терапии
   */
  const handleClassChange = (e) => {
    const newClass = e.target.value
    setSelectedClass(newClass)
    // Сбрасываем схему и препараты при изменении класса
    setSelectedRegimen('')
    setSelectedDrugs([])
  }

  /**
   * Обработчик изменения схемы
   */
  const handleRegimenChange = (e) => {
    const newRegimen = e.target.value
    setSelectedRegimen(newRegimen)
    // Сбрасываем препараты если выбрана не OTHER_REGIMEN
    if (newRegimen !== 'OTHER_REGIMEN') {
      setSelectedDrugs([])
    }
  }

  /**
   * Обработчик изменения препаратов (multi-select)
   */
  const handleDrugsChange = (e) => {
    const options = e.target.options
    const selected = []
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value)
      }
    }
    setSelectedDrugs(selected)
  }

  /**
   * Удаление препарата из списка
   */
  const removeDrug = (drugCode) => {
    setSelectedDrugs(prev => prev.filter(d => d !== drugCode))
  }

  /**
   * Получение названия по коду
   */
  const getDrugName = (code) => {
    const drug = drugs.find(d => d.code === code)
    return drug ? drug.value_ru : code
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
        <div className={styles.loading}>Загрузка справочников...</div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={styles.container}>
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
        <div className={styles.error}>{loadError}</div>
        <button 
          className={styles.retryButton}
          onClick={loadDictionaries}
          type="button"
        >
          Повторить попытку
        </button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>

      {/* Выбор класса терапии */}
      <div className={styles.selectGroup}>
        <label className={styles.selectLabel}>
          1. Класс терапии
          {required && <span className={styles.required}>*</span>}
        </label>
        <select
          className={`${styles.select} ${validationErrors.therapy_class || errors.therapy_class ? styles.selectError : ''}`}
          value={selectedClass}
          onChange={handleClassChange}
          disabled={disabled}
          required={required}
        >
          <option value="">-- Выберите класс терапии --</option>
          {classes.map(cls => (
            <option key={cls.code} value={cls.code}>
              {cls.value_ru}
            </option>
          ))}
        </select>
        {(validationErrors.therapy_class || errors.therapy_class) && (
          <div className={styles.errorMessage}>
            {validationErrors.therapy_class || errors.therapy_class}
          </div>
        )}
      </div>

      {/* Выбор схемы терапии */}
      {selectedClass && (
        <div className={styles.selectGroup}>
          <label className={styles.selectLabel}>
            2. Схема терапии
            <span className={styles.required}>*</span>
          </label>
          <select
            className={`${styles.select} ${validationErrors.regimen_code || errors.regimen_code ? styles.selectError : ''}`}
            value={selectedRegimen}
            onChange={handleRegimenChange}
            disabled={disabled}
            required
          >
            <option value="">-- Выберите схему --</option>
            {filteredRegimens.map(reg => (
              <option key={reg.code} value={reg.code}>
                {reg.value_ru}
              </option>
            ))}
          </select>
          {(validationErrors.regimen_code || errors.regimen_code) && (
            <div className={styles.errorMessage}>
              {validationErrors.regimen_code || errors.regimen_code}
            </div>
          )}
        </div>
      )}

      {/* Выбор препаратов (только для OTHER_REGIMEN) */}
      {selectedRegimen === 'OTHER_REGIMEN' && (
        <div className={styles.selectGroup}>
          <label className={styles.selectLabel}>
            3. Препараты
            <span className={styles.required}>*</span>
          </label>
          <select
            className={`${styles.select} ${styles.multiSelect} ${validationErrors.custom_drugs || errors.custom_drugs ? styles.selectError : ''}`}
            multiple
            value={selectedDrugs}
            onChange={handleDrugsChange}
            disabled={disabled}
            size={8}
          >
            {drugs.map(drug => (
              <option key={drug.code} value={drug.code}>
                {drug.value_ru}
              </option>
            ))}
          </select>
          <div className={styles.hint}>
            Удерживайте Ctrl (Cmd на Mac) для выбора нескольких препаратов
          </div>
          {(validationErrors.custom_drugs || errors.custom_drugs) && (
            <div className={styles.errorMessage}>
              {validationErrors.custom_drugs || errors.custom_drugs}
            </div>
          )}

          {/* Теги выбранных препаратов */}
          {selectedDrugs.length > 0 && (
            <div className={styles.tagsContainer}>
              <div className={styles.tagsLabel}>Выбранные препараты:</div>
              <div className={styles.tags}>
                {selectedDrugs.map(drugCode => (
                  <span key={drugCode} className={styles.tag}>
                    {getDrugName(drugCode)}
                    {!disabled && (
                      <button
                        type="button"
                        className={styles.tagRemove}
                        onClick={() => removeDrug(drugCode)}
                        aria-label={`Удалить ${getDrugName(drugCode)}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TherapyBuilder
