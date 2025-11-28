import React, { createContext, useContext, useState, useEffect } from 'react'

// Константы типов регистров
export const REGISTRY_TYPES = {
  ALK: 'ALK',
  ROS1: 'ROS1'
}

// Константы цветов для регистров
export const REGISTRY_COLORS = {
  ALK: '#2563eb',
  ROS1: '#16a34a'
}

// Константы названий регистров
export const REGISTRY_NAMES = {
  ALK: 'Регистр ALK',
  ROS1: 'Регистр ROS1'
}

// Константы описаний регистров
export const REGISTRY_DESCRIPTIONS = {
  ALK: 'Регистр пациентов с ALK-позитивным НМРЛ',
  ROS1: 'Регистр пациентов с ROS1-позитивным НМРЛ'
}

// Создание контекста
const RegistryContext = createContext(undefined)

// Ключ для localStorage
const STORAGE_KEY = 'selectedRegistry'

/**
 * Provider для управления выбором регистра
 */
export function RegistryProvider({ children }) {
  // Инициализация состояния из localStorage
  const [registryType, setRegistryTypeState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && Object.values(REGISTRY_TYPES).includes(stored)) {
        return stored
      }
    } catch (error) {
      console.error('Error reading registry from localStorage:', error)
    }
    return null
  })

  // Синхронизация с localStorage при изменении
  useEffect(() => {
    try {
      if (registryType) {
        localStorage.setItem(STORAGE_KEY, registryType)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (error) {
      console.error('Error writing registry to localStorage:', error)
    }
  }, [registryType])

  /**
   * Устанавливает тип регистра
   * @param {string} type - Тип регистра (ALK или ROS1)
   */
  const setRegistryType = (type) => {
    if (!Object.values(REGISTRY_TYPES).includes(type)) {
      console.error(`Invalid registry type: ${type}`)
      return
    }
    setRegistryTypeState(type)
  }

  /**
   * Очищает выбранный регистр
   */
  const clearRegistry = () => {
    setRegistryTypeState(null)
  }

  /**
   * Получает цвет текущего регистра
   */
  const getRegistryColor = () => {
    return registryType ? REGISTRY_COLORS[registryType] : '#2563eb'
  }

  /**
   * Получает название текущего регистра
   */
  const getRegistryName = () => {
    return registryType ? REGISTRY_NAMES[registryType] : 'Регистр'
  }

  /**
   * Получает описание текущего регистра
   */
  const getRegistryDescription = () => {
    return registryType ? REGISTRY_DESCRIPTIONS[registryType] : ''
  }

  /**
   * Проверяет, выбран ли регистр
   */
  const isRegistrySelected = () => {
    return registryType !== null
  }

  const value = {
    registryType,
    setRegistryType,
    clearRegistry,
    getRegistryColor,
    getRegistryName,
    getRegistryDescription,
    isRegistrySelected,
    REGISTRY_TYPES,
    REGISTRY_COLORS,
    REGISTRY_NAMES,
    REGISTRY_DESCRIPTIONS
  }

  return (
    <RegistryContext.Provider value={value}>
      {children}
    </RegistryContext.Provider>
  )
}

/**
 * Хук для использования контекста регистра
 * @throws {Error} Если используется вне RegistryProvider
 */
export function useRegistry() {
  const context = useContext(RegistryContext)
  if (context === undefined) {
    throw new Error('useRegistry must be used within a RegistryProvider')
  }
  return context
}

export default RegistryContext
