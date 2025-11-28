import React, { useState } from 'react'
import TherapyBuilder from '../components/TherapyBuilder'
import styles from './TherapyBuilderTestPage.module.css'

/**
 * Тестовая страница для демонстрации компонента TherapyBuilder
 * Показывает различные состояния компонента: пустой, заполненный, disabled, с ошибками
 */
const TherapyBuilderTestPage = () => {
  // State для разных примеров
  const [emptyValue, setEmptyValue] = useState({})
  const [filledValue, setFilledValue] = useState({
    therapy_class: 'TARGET_ROS1',
    regimen_code: 'CRIZOTINIB',
    custom_drugs: []
  })
  const [customValue, setCustomValue] = useState({
    therapy_class: 'PLATINUM_DOUBLET',
    regimen_code: 'OTHER_REGIMEN',
    custom_drugs: ['CISPLATIN', 'PEMETREXED']
  })
  const [disabledValue] = useState({
    therapy_class: 'MONO_IO',
    regimen_code: 'OTHER_REGIMEN',
    custom_drugs: ['PEMBROLIZUMAB']
  })

  // State для вывода данных
  const [emptyOutput, setEmptyOutput] = useState({})
  const [filledOutput, setFilledOutput] = useState({})
  const [customOutput, setCustomOutput] = useState({})

  // State для ошибок
  const [emptyErrors, setEmptyErrors] = useState({})
  const [filledErrors, setFilledErrors] = useState({})
  const [customErrors, setCustomErrors] = useState({})

  // Обработчики изменений
  const handleEmptyChange = (value, errors) => {
    setEmptyValue(value)
    setEmptyOutput(value)
    setEmptyErrors(errors)
  }

  const handleFilledChange = (value, errors) => {
    setFilledValue(value)
    setFilledOutput(value)
    setFilledErrors(errors)
  }

  const handleCustomChange = (value, errors) => {
    setCustomValue(value)
    setCustomOutput(value)
    setCustomErrors(errors)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>TherapyBuilder - Тестовая страница</h1>
        <p className={styles.subtitle}>
          Демонстрация различных состояний компонента выбора терапии
        </p>
      </div>

      <div className={styles.content}>
        {/* Пример 1: Пустой компонент с валидацией */}
        <section className={styles.section}>
          <h2>1. Пустой компонент (с обязательными полями)</h2>
          <p className={styles.description}>
            Компонент без начальных значений. Все поля обязательны для заполнения.
          </p>
          
          <div className={styles.demo}>
            <TherapyBuilder
              value={emptyValue}
              onChange={handleEmptyChange}
              required={true}
              label="Терапия пациента"
            />
          </div>

          <div className={styles.output}>
            <h4>Текущее значение:</h4>
            <pre>{JSON.stringify(emptyOutput, null, 2)}</pre>
            {Object.keys(emptyErrors).length > 0 && (
              <>
                <h4>Ошибки валидации:</h4>
                <pre className={styles.errors}>
                  {JSON.stringify(emptyErrors, null, 2)}
                </pre>
              </>
            )}
          </div>
        </section>

        {/* Пример 2: Заполненный компонент */}
        <section className={styles.section}>
          <h2>2. Заполненный компонент (стандартная схема)</h2>
          <p className={styles.description}>
            Компонент с предзаполненными значениями. Выбран класс "Таргетная терапия ROS1" 
            и схема "Кризотиниб".
          </p>
          
          <div className={styles.demo}>
            <TherapyBuilder
              value={filledValue}
              onChange={handleFilledChange}
              required={true}
              label="Линия терапии"
            />
          </div>

          <div className={styles.output}>
            <h4>Текущее значение:</h4>
            <pre>{JSON.stringify(filledOutput, null, 2)}</pre>
            {Object.keys(filledErrors).length > 0 && (
              <>
                <h4>Ошибки валидации:</h4>
                <pre className={styles.errors}>
                  {JSON.stringify(filledErrors, null, 2)}
                </pre>
              </>
            )}
          </div>
        </section>

        {/* Пример 3: Кастомная схема с препаратами */}
        <section className={styles.section}>
          <h2>3. Кастомная схема (OTHER_REGIMEN)</h2>
          <p className={styles.description}>
            Компонент с выбором "Другая схема" и ручным выбором препаратов. 
            Демонстрирует multi-select и теги препаратов.
          </p>
          
          <div className={styles.demo}>
            <TherapyBuilder
              value={customValue}
              onChange={handleCustomChange}
              required={true}
              label="Индивидуальная схема"
            />
          </div>

          <div className={styles.output}>
            <h4>Текущее значение:</h4>
            <pre>{JSON.stringify(customOutput, null, 2)}</pre>
            {Object.keys(customErrors).length > 0 && (
              <>
                <h4>Ошибки валидации:</h4>
                <pre className={styles.errors}>
                  {JSON.stringify(customErrors, null, 2)}
                </pre>
              </>
            )}
          </div>
        </section>

        {/* Пример 4: Disabled компонент */}
        <section className={styles.section}>
          <h2>4. Disabled компонент</h2>
          <p className={styles.description}>
            Компонент в режиме только для чтения. Все элементы отключены.
          </p>
          
          <div className={styles.demo}>
            <TherapyBuilder
              value={disabledValue}
              onChange={() => {}}
              disabled={true}
              label="Терапия (просмотр)"
            />
          </div>

          <div className={styles.output}>
            <h4>Значение:</h4>
            <pre>{JSON.stringify(disabledValue, null, 2)}</pre>
          </div>
        </section>

        {/* Пример 5: Необязательное поле */}
        <section className={styles.section}>
          <h2>5. Необязательное поле</h2>
          <p className={styles.description}>
            Компонент без обязательных полей. Валидация не требует заполнения.
          </p>
          
          <div className={styles.demo}>
            <TherapyBuilder
              value={{}}
              onChange={() => {}}
              required={false}
              label="Дополнительная терапия (опционально)"
            />
          </div>
        </section>

        {/* Документация */}
        <section className={styles.section}>
          <h2>Документация API</h2>
          <div className={styles.apiDocs}>
            <h3>Props</h3>
            <ul>
              <li>
                <code>value</code> (Object): Текущее значение компонента
                <pre>{'{ therapy_class: string, regimen_code: string, custom_drugs: string[] }'}</pre>
              </li>
              <li>
                <code>onChange</code> (Function): Callback для обработки изменений
                <pre>{'(value: Object, errors: Object) => void'}</pre>
              </li>
              <li>
                <code>disabled</code> (boolean): Отключить компонент (по умолчанию: false)
              </li>
              <li>
                <code>required</code> (boolean): Обязательное поле (по умолчанию: false)
              </li>
              <li>
                <code>label</code> (string): Метка компонента (по умолчанию: "Терапия")
              </li>
              <li>
                <code>errors</code> (Object): Внешние ошибки валидации (опционально)
              </li>
            </ul>

            <h3>Логика работы</h3>
            <ol>
              <li>Пользователь выбирает <strong>класс терапии</strong> (Select 1)</li>
              <li>Отображаются <strong>схемы терапии</strong>, где parent == selectedClass или parent == 'ALL' (Select 2)</li>
              <li>Если выбрана схема <strong>OTHER_REGIMEN</strong>, появляется multi-select для выбора препаратов (Select 3)</li>
              <li>Компонент возвращает объект через onChange с валидационными ошибками</li>
            </ol>

            <h3>Валидация</h3>
            <ul>
              <li>Класс терапии обязателен, если required=true</li>
              <li>Схема обязательна, если выбран класс</li>
              <li>Препараты обязательны, если выбрана схема OTHER_REGIMEN</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}

export default TherapyBuilderTestPage
