import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { patientService } from '../services/patientService'
import { useRegistry } from '../contexts/RegistryContext'
import './PatientsPage.css'

function PatientsPage({ user }) {
  const navigate = useNavigate()
  const { registryType } = useRegistry()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [institutions, setInstitutions] = useState([])
  
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportMode, setExportMode] = useState('standard')
  const [isExporting, setIsExporting] = useState(false)
  
  // Search and filter states
  const [searchFilters, setSearchFilters] = useState({
    patient_code: '',
    birth_date: '',
    institution_id: '',
    registry_type: registryType // Фильтр по умолчанию из контекста
  })

  useEffect(() => {
    loadPatients()
    loadInstitutions()
  }, [])

  // Автоматически обновляем фильтр и список при смене регистра в шапке
  useEffect(() => {
    if (registryType) {
      setSearchFilters(prev => ({ ...prev, registry_type: registryType }))
      loadPatients({ ...searchFilters, registry_type: registryType })
    }
  }, [registryType])

  const loadInstitutions = async () => {
    try {
      const response = await fetch('/api/institutions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setInstitutions(data)
      }
    } catch (err) {
      console.error('Error loading institutions:', err)
    }
  }

  const loadPatients = async (filters = {}) => {
    try {
      setLoading(true)
      
      const activeFilters = { 
          ...searchFilters, 
          ...filters, 
          registry_type: registryType 
      }

      // Build query parameters
      const params = new URLSearchParams()
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      
      const queryString = params.toString()
      const url = `/api/patients${queryString ? `?${queryString}` : ''}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPatients(data)
      } else {
        setError('Ошибка загрузки данных')
      }
    } catch (err) {
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пациента?')) {
      return
    }

    try {
      await patientService.deletePatient(id)
      setPatients(patients.filter(p => p.id !== id))
    } catch (err) {
      alert('Ошибка удаления пациента')
    }
  }

  const handleSearchChange = (e) => {
    const { name, value } = e.target
    setSearchFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleSearch = () => {
    loadPatients(searchFilters)
  }

  const handleClearSearch = () => {
    const resetFilters = {
      patient_code: '',
      birth_date: '',
      institution_id: '',
      registry_type: registryType
    }
    setSearchFilters(resetFilters)
    loadPatients(resetFilters)
  }

  const handleExportClick = () => {
    setShowExportModal(true)
  }

  const performExport = async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      if (searchFilters.institution_id) {
        params.append('institution_id', searchFilters.institution_id)
      }
      if (registryType) {
          params.append('registry_type', registryType)
      }
      params.append('mode', exportMode)
      
      const response = await fetch(`/api/export/patients?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const contentDisposition = response.headers.get('Content-Disposition')
        let filename = `patients_export_${registryType}_${new Date().toISOString().slice(0,10)}.csv`
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
            if (filenameMatch && filenameMatch.length === 2)
                filename = filenameMatch[1]
        }
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        setShowExportModal(false)
      } else {
        alert('Ошибка экспорта данных')
      }
    } catch (err) {
      alert('Ошибка экспорта данных')
    } finally {
      setIsExporting(false)
    }
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  return (
    <div className="patients-page">
      <div className="page-header">
        <h2>Список пациентов ({registryType})</h2>
        <div className="header-actions">
          {user.role === 'admin' && (
            <button onClick={handleExportClick} className="btn btn-info">
              📊 Экспорт в Excel
            </button>
          )}
          <Link to="/patients/new" className="btn btn-primary">
            + Добавить пациента
          </Link>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="search-section">
        <div className="search-filters">
          <div className="filter-group">
            <label>Код пациента:</label>
            <input
              type="text"
              name="patient_code"
              value={searchFilters.patient_code}
              onChange={handleSearchChange}
              placeholder="Введите код пациента"
              className="form-input"
            />
          </div>
          
          <div className="filter-group">
            <label>Дата рождения:</label>
            <input
              type="date"
              name="birth_date"
              value={searchFilters.birth_date}
              onChange={handleSearchChange}
              className="form-input"
            />
          </div>
          
          {user.role === 'admin' && (
            <div className="filter-group">
              <label>Учреждение:</label>
              <select
                name="institution_id"
                value={searchFilters.institution_id}
                onChange={handleSearchChange}
                className="form-select"
              >
                <option value="">Все учреждения</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="search-actions">
          <button onClick={handleSearch} className="btn btn-primary">
            🔍 Поиск
          </button>
          <button onClick={handleClearSearch} className="btn btn-secondary">
            ✖️ Очистить
          </button>
        </div>
      </div>

      {patients.length === 0 ? (
        <div className="empty-state">
          <h3>Нет найденных пациентов</h3>
          <p>Попробуйте изменить параметры поиска или добавить нового пациента</p>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Код пациента</th>
                <th>Пол</th>
                <th>Дата рождения</th>
                <th>Возраст</th>
                {registryType === 'ALK' && <th>Дата начала алектиниба</th>}
                <th>Статус</th>
                <th>Дата заполнения</th>
                <th>Заполненность</th>
                <th>Учреждение</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => {
                const cr = patient.clinical_record || {}
                const completion = patient.completion_data || { filled_fields: 0, total_fields: 0, completion_percentage: 0 }
                
                return (
                  <tr key={patient.id}>
                    <td>
                      <strong>{cr.patient_code || `ID-${patient.id}`}</strong>
                    </td>
                    <td>{cr.gender || '—'}</td>
                    <td>
                      {cr.birth_date 
                        ? new Date(cr.birth_date).toLocaleDateString('ru-RU')
                        : '—'
                      }
                    </td>
                    <td>{cr.age_at_diagnosis || '—'}</td>
                    {registryType === 'ALK' && (
                        <td>
                        {cr.alectinib_start_date
                            ? new Date(cr.alectinib_start_date).toLocaleDateString('ru-RU')
                            : '—'
                        }
                        </td>
                    )}
                    <td>
                      <span className={`badge ${
                        cr.current_status === 'ALIVE' 
                          ? 'badge-success' 
                          : cr.current_status === 'DEAD'
                          ? 'badge-danger'
                          : 'badge-warning'
                      }`}>
                        {cr.current_status === 'ALIVE' ? 'Жив' : 
                         cr.current_status === 'DEAD' ? 'Умер' :
                         cr.current_status === 'LOST_TO_FOLLOWUP' ? 'Ушел из наблюдения' :
                         cr.current_status || 'Не указан'}
                      </span>
                    </td>
                    <td>
                      {cr.date_filled 
                        ? new Date(cr.date_filled).toLocaleDateString('ru-RU')
                        : '—'
                      }
                    </td>
                    <td>
                        <div className="completion-info">
                          <span className="completion-fraction">
                            {completion.filled_fields}/{completion.total_fields}
                          </span>
                          <span className="completion-percentage">
                            ({completion.completion_percentage.toFixed(1)}%)
                          </span>
                        </div>
                    </td>
                    <td>{patient.institution_name}</td>
                    <td>
                      <div className="action-buttons">
                        <Link 
                          to={`/patients/${patient.id}`}
                          className="btn btn-secondary btn-sm"
                        >
                          Открыть
                        </Link>
                        {(user.role === 'admin' || patient.institution_id === user.institution_id) && (
                          <button
                            onClick={() => handleDelete(patient.id)}
                            className="btn btn-subtle btn-sm"
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Export Options Modal */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Параметры экспорта</h3>
              <button 
                className="close-btn" 
                onClick={() => !isExporting && setShowExportModal(false)}
                disabled={isExporting}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-description">Выберите тип отчета для выгрузки:</p>
              
              <div className="export-options">
                <label className={`export-option ${exportMode === 'standard' ? 'selected' : ''}`}>
                  <div className="radio-wrapper">
                    <input 
                      type="radio" 
                      name="exportMode" 
                      value="standard" 
                      checked={exportMode === 'standard'}
                      onChange={(e) => setExportMode(e.target.value)}
                      disabled={isExporting}
                    />
                  </div>
                  <div className="option-content">
                    <span className="option-title">Стандартный отчет</span>
                    <span className="option-desc">Краткая сводка основных клинических показателей</span>
                  </div>
                </label>
                
                <label className={`export-option ${exportMode === 'full' ? 'selected' : ''}`}>
                  <div className="radio-wrapper">
                    <input 
                      type="radio" 
                      name="exportMode" 
                      value="full" 
                      checked={exportMode === 'full'}
                      onChange={(e) => setExportMode(e.target.value)}
                      disabled={isExporting}
                    />
                  </div>
                  <div className="option-content">
                    <span className="option-title">Полная выгрузка БД</span>
                    <span className="option-desc">Все поля, включая JSON-структуры</span>
                  </div>
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
              >
                Отмена
              </button>
              <button 
                className="btn btn-primary" 
                onClick={performExport}
                disabled={isExporting}
              >
                {isExporting ? 'Генерация файла...' : 'Скачать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PatientsPage