import React, { useState, useEffect } from 'react'
import './UserManagementPage.css'

function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [institutions, setInstitutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user',
    institution_id: ''
  })

  useEffect(() => {
    loadUsers()
    loadInstitutions()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        setError('Ошибка загрузки пользователей')
      }
    } catch (err) {
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

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

  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newUser)
      })

      if (response.ok) {
        await loadUsers()
        setShowCreateForm(false)
        setNewUser({ username: '', password: '', role: 'user', institution_id: '' })
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Ошибка создания пользователя')
      }
    } catch (err) {
      setError('Ошибка создания пользователя')
    }
  }

  const handleToggleActive = async (userId, isActive) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_active: !isActive })
      })

      if (response.ok) {
        await loadUsers()
      } else {
        setError('Ошибка изменения статуса пользователя')
      }
    } catch (err) {
      setError('Ошибка изменения статуса')
    }
  }

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (response.ok) {
          await loadUsers()
        } else {
          setError('Ошибка удаления пользователя')
        }
      } catch (err) {
        setError('Ошибка удаления пользователя')
      }
    }
  }

  const getRoleName = (role) => {
    return role === 'admin' ? 'Администратор' : 'Пользователь'
  }

  const getStatusName = (isActive) => {
    return isActive ? 'Активен' : 'Заблокирован'
  }

  if (loading) {
    return <div className="loading">Загрузка пользователей...</div>
  }

  return (
    <div className="user-management-page">
      <div className="page-header">
        <h2>Управление пользователями</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          + Добавить пользователя
        </button>
      </div>

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Добавить нового пользователя</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCreateForm(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Имя пользователя</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Пароль</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Роль</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="form-select"
                >
                  <option value="user">Пользователь</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Учреждение</label>
                <select
                  value={newUser.institution_id}
                  onChange={(e) => setNewUser({...newUser, institution_id: e.target.value})}
                  className="form-select"
                  required
                >
                  <option value="">Выберите учреждение</option>
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Создать
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Имя пользователя</th>
              <th>Роль</th>
              <th>Учреждение</th>
              <th>Статус</th>
              <th>Последний вход</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={!user.is_active ? 'inactive-user' : ''}>
                <td>{user.username}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {getRoleName(user.role)}
                  </span>
                </td>
                <td>{user.institution_name}</td>
                <td>
                  <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                    {getStatusName(user.is_active)}
                  </span>
                </td>
                <td>
                  {user.last_login ? (
                    <div className="last-login">
                      <div className="login-date">
                        {new Date(user.last_login).toLocaleDateString('ru-RU', {
                          timeZone: 'Europe/Moscow'
                        })}
                      </div>
                      <div className="login-time">
                        {new Date(user.last_login).toLocaleTimeString('ru-RU', {
                          timeZone: 'Europe/Moscow',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  ) : (
                    <span className="no-login">Не входил</span>
                  )}
                </td>
                <td className="actions">
                  <button
                    className={`btn btn-sm ${user.is_active ? 'btn-subtle' : 'btn-success'}`}
                    onClick={() => handleToggleActive(user.id, user.is_active)}
                    title={user.is_active ? 'Заблокировать' : 'Активировать'}
                  >
                    {user.is_active ? '🚫' : '✅'}
                  </button>
                  <button
                    className="btn btn-sm btn-subtle"
                    onClick={() => handleDeleteUser(user.id)}
                    title="Удалить"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="empty-state">
            <p>Пользователи не найдены</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserManagementPage
