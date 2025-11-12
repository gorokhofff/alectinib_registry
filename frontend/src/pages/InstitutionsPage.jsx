
import React, { useState, useEffect } from 'react'
import './InstitutionsPage.css'

function InstitutionsPage() {
  const [institutions, setInstitutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newInstitution, setNewInstitution] = useState({
    name: '',
    code: '',
    city: ''
  })

  useEffect(() => {
    loadInstitutions()
  }, [])

  const loadInstitutions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/institutions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setInstitutions(data)
      } else {
        setError('Ошибка загрузки учреждений')
      }
    } catch (err) {
      setError('Ошибка загрузки учреждений')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInstitution = async (e) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/institutions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newInstitution)
      })

      if (response.ok) {
        setShowCreateForm(false)
        setNewInstitution({ name: '', code: '', city: '' })
        loadInstitutions()
      } else {
        const error = await response.json()
        alert(error.detail || 'Ошибка создания учреждения')
      }
    } catch (err) {
      alert('Ошибка создания учреждения')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewInstitution(prev => ({ ...prev, [name]: value }))
  }

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const response = await fetch(`/api/institutions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      })

      if (response.ok) {
        loadInstitutions()
      } else {
        alert('Ошибка изменения статуса учреждения')
      }
    } catch (err) {
      alert('Ошибка изменения статуса учреждения')
    }
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  return (
    <div className="institutions-page">
      <div className="page-header">
        <h2>Управление учреждениями</h2>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary"
        >
          + Добавить учреждение
        </button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Код</th>
              <th>Город</th>
              <th>Дата создания</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {institutions.map((institution) => (
              <tr key={institution.id}>
                <td><strong>{institution.name}</strong></td>
                <td>{institution.code || '—'}</td>
                <td>{institution.city || '—'}</td>
                <td>
                  {new Date(institution.created_at).toLocaleDateString('ru-RU')}
                </td>
                <td>
                  <span className={`status-badge ${institution.is_active ? 'active' : 'inactive'}`}>
                    {institution.is_active ? 'Активное' : 'Неактивное'}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => handleToggleActive(institution.id, institution.is_active)}
                    className={`btn btn-sm ${institution.is_active ? 'btn-subtle' : 'btn-success'}`}
                  >
                    {institution.is_active ? 'Деактивировать' : 'Активировать'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Institution Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Добавление нового учреждения</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateInstitution}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Название учреждения *</label>
                  <input
                    type="text"
                    name="name"
                    value={newInstitution.name}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Код учреждения</label>
                  <input
                    type="text"
                    name="code"
                    value={newInstitution.code}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Опциональный код"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Город</label>
                  <input
                    type="text"
                    name="city"
                    value={newInstitution.city}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Город расположения"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Создать учреждение
                </button>
                <button 
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-secondary"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default InstitutionsPage
