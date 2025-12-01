import React, { useState, useEffect, useMemo } from 'react'
import styles from './TherapyBuilder.module.css'

const TherapyBuilder = ({ 
  value = {}, 
  onChange, 
  dictionaries = {}, 
  disabled = false, 
  required = false, 
  label = 'Терапия',
  errors = {}
}) => {
  const [selectedDrugs, setSelectedDrugs] = useState(value?.custom_drugs || [])
  
  useEffect(() => {
    if (value?.custom_drugs && JSON.stringify(value.custom_drugs) !== JSON.stringify(selectedDrugs)) {
      setSelectedDrugs(value.custom_drugs)
    }
  }, [value])

  const drugsList = useMemo(() => dictionaries.chemo_drugs || [], [dictionaries])
  const classesList = useMemo(() => dictionaries.therapy_classes || [], [dictionaries])
  const regimensList = useMemo(() => dictionaries.treatment_regimens || [], [dictionaries])

  const calculateTherapyInfo = (currentDrugsCodes) => {
    if (!currentDrugsCodes || currentDrugsCodes.length === 0) return { therapy_class: '', regimen_code: '' }

    const selectedDrugObjects = currentDrugsCodes.map(code => 
      drugsList.find(d => d.code === code)
    ).filter(Boolean)

    const hasChemo = selectedDrugObjects.some(d => d.parent === 'CHEMOTHERAPY')
    const hasImmuno = selectedDrugObjects.some(d => d.parent === 'IMMUNOTHERAPY')
    const hasTargeted = selectedDrugObjects.some(d => d.parent === 'TARGETED')
    const hasPlatinum = selectedDrugObjects.some(d => ['CISPLATIN', 'CARBOPLATIN'].includes(d.code))

    let computedClass = 'OTHER'
    let computedRegimen = 'OTHER_REGIMEN'

    if (hasChemo && hasImmuno) computedClass = 'CHEMOIMMUNOTHERAPY'
    else if (hasChemo) computedClass = 'CHEMOTHERAPY'
    else if (hasImmuno) computedClass = 'IMMUNOTHERAPY'
    else if (hasTargeted) computedClass = 'TARGETED'

    if (currentDrugsCodes.length === 1) computedRegimen = 'MONOTHERAPY'
    else if (currentDrugsCodes.length === 2) computedRegimen = hasPlatinum ? 'PLATINUM_DOUBLET' : 'NON_PLATINUM_DOUBLET'
    else computedRegimen = 'OTHER_REGIMEN'

    return { therapy_class: computedClass, regimen_code: computedRegimen }
  }

  const updateParent = (newDrugs) => {
    setSelectedDrugs(newDrugs)
    const { therapy_class, regimen_code } = calculateTherapyInfo(newDrugs)
    if (onChange) onChange({ custom_drugs: newDrugs, therapy_class, regimen_code })
  }

  const handleAddDrug = (e) => {
    const code = e.target.value
    if (!code || selectedDrugs.includes(code)) return
    updateParent([...selectedDrugs, code])
    e.target.value = ""
  }

  const handleRemoveDrug = (code) => {
    updateParent(selectedDrugs.filter(c => c !== code))
  }

  const getDrugName = (code) => drugsList.find(d => d.code === code)?.value_ru || code
  const availableDrugs = useMemo(() => drugsList.filter(d => !selectedDrugs.includes(d.code)), [drugsList, selectedDrugs])
  
  const info = calculateTherapyInfo(selectedDrugs)
  const classLabel = classesList.find(c => c.code === info.therapy_class)?.value_ru
  const regimenLabel = regimensList.find(r => r.code === info.regimen_code)?.value_ru

  return (
    <div className={styles.container}>
      {label && <label className={styles.label}>{label} {required && <span className={styles.required}>*</span>}</label>}
      <div className={styles.tagsContainer}>
        {selectedDrugs.map(code => (
            <span key={code} className={styles.tag}>{getDrugName(code)} {!disabled && <button type="button" className={styles.removeBtn} onClick={() => handleRemoveDrug(code)}>×</button>}</span>
        ))}
        {!disabled && (
            <select className={styles.miniSelect} onChange={handleAddDrug} value=""><option value="" disabled>+ Препарат</option>
                <optgroup label="Таргетная">{availableDrugs.filter(d => d.parent === 'TARGETED').map(d => <option key={d.code} value={d.code}>{d.value_ru}</option>)}</optgroup>
                <optgroup label="Иммуно">{availableDrugs.filter(d => d.parent === 'IMMUNOTHERAPY').map(d => <option key={d.code} value={d.code}>{d.value_ru}</option>)}</optgroup>
                <optgroup label="Химио">{availableDrugs.filter(d => d.parent === 'CHEMOTHERAPY').map(d => <option key={d.code} value={d.code}>{d.value_ru}</option>)}</optgroup>
            </select>
        )}
      </div>
      {selectedDrugs.length > 0 && <div className={styles.autoInfo}><small>{classLabel} {regimenLabel ? `(${regimenLabel})` : ''}</small></div>}
    </div>
  )
}

export default TherapyBuilder