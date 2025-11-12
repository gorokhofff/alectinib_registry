
import React, { useState } from 'react'
import { authService } from '../services/authService'
import './LoginPage.css'

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await authService.login(username, password)
      onLogin(user)
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Регистр Алектиниб</h1>
        <p className="login-subtitle">Регистр клинических случаев лечения алектинибом</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="alert alert-error">{error}</div>
          )}
          
          <div className="form-group">
            <label className="form-label">Логин</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Пароль</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>Для входа используйте учетные данные,<br/>предоставленные администратором</p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
