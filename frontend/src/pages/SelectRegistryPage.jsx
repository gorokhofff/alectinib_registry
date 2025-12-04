import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useRegistry } from '../contexts/RegistryContext'
import styles from './SelectRegistryPage.module.css'

function SelectRegistryPage() {
  const navigate = useNavigate()
  const { setRegistryType, REGISTRY_TYPES, REGISTRY_DESCRIPTIONS } = useRegistry()

  const handleSelectRegistry = (type) => {
    setRegistryType(type)
    navigate('/patients')
  }

  return (
    <div className={styles.selectRegistryPage}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Система клинических регистров</h1>
          <p className={styles.subtitle}>
            Пожалуйста, выберите соответствующую нозологию для начала работы
          </p>
        </header>

        <div className={styles.cardsGrid}>
          {/* Карточка ALK */}
          <div
            className={`${styles.card} ${styles.cardAlk}`}
            onClick={() => handleSelectRegistry(REGISTRY_TYPES.ALK)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleSelectRegistry(REGISTRY_TYPES.ALK)
              }
            }}
          >
            <div className={styles.cardIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
                <path d="M12.5 14.5 L12.5 21" />
                <path d="M6.5 8.5 L12.5 14.5 L18.5 8.5" />
                <path d="M3 5 Q3 3, 5 3 L19 3 Q21 3, 21 5" />
                <circle cx="12" cy="3" r="1" fill="currentColor" />
                <circle cx="8" cy="6" r="1" fill="currentColor" />
                <circle cx="16" cy="6" r="1" fill="currentColor" />
              </svg>
            </div>
            <h2 className={styles.cardTitle}>Регистр ALK</h2>
            <p className={styles.cardDescription}>
              Клинический регистр пациентов с ALK-позитивным немелкоклеточным раком легкого
            </p>
            <div className={styles.cardButton}>
              Перейти к регистру
            </div>
          </div>

          {/* Карточка ROS1 */}
          <div
            className={`${styles.card} ${styles.cardRos1}`}
            onClick={() => handleSelectRegistry(REGISTRY_TYPES.ROS1)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleSelectRegistry(REGISTRY_TYPES.ROS1)
              }
            }}
          >
            <div className={styles.cardIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
                <path d="M12.5 14.5 L12.5 21" />
                <path d="M6.5 8.5 L12.5 14.5 L18.5 8.5" />
                <path d="M3 5 Q3 3, 5 3 L19 3 Q21 3, 21 5" />
                <circle cx="12" cy="3" r="1" fill="currentColor" />
                <circle cx="8" cy="6" r="1" fill="currentColor" />
                <circle cx="16" cy="6" r="1" fill="currentColor" />
              </svg>
            </div>
            <h2 className={styles.cardTitle}>Регистр ROS1</h2>
            <p className={styles.cardDescription}>
              Клинический регистр пациентов с ROS1-позитивным немелкоклеточным раком легкого
            </p>
            <div className={styles.cardButton}>
              Перейти к регистру
            </div>
          </div>
        </div>

        <footer className={styles.footer}>
          <p>Система сбора и анализа клинических данных</p>
        </footer>
      </div>
    </div>
  )
}

export default SelectRegistryPage