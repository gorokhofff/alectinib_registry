import React, { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useRegistry } from '../contexts/RegistryContext'
// Убедитесь, что файл CSS существует по этому пути, или закомментируйте, если стили глобальные
import './Layout.css'

function Layout({ user, onLogout, children }) {
  const location = useLocation()
  const navigate = useNavigate()
  // Получаем данные из контекста. Убедитесь, что RegistryContext предоставляет эти методы
  const { registryType, getRegistryColor, getRegistryName } = useRegistry()

  const isActive = (path) => location.pathname === path

  // Динамически обновляем CSS переменную --primary-color
  useEffect(() => {
    if (registryType && getRegistryColor) {
      const primaryColor = getRegistryColor()
      document.documentElement.style.setProperty('--primary-color', primaryColor)
    }
  }, [registryType, getRegistryColor])

  // Безопасное получение имени и цвета с фолбэком
  const regName = getRegistryName ? getRegistryName() : 'Регистр'
  const regColor = getRegistryColor ? getRegistryColor() : '#2563eb'

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="header-title-container">
            <h1 className="header-title">{regName}</h1>
            {registryType && (
              <>
                <span 
                  className="registry-badge"
                  style={{ backgroundColor: regColor }}
                >
                  {registryType}
                </span>
                {/* КНОПКА СМЕНЫ РЕГИСТРА В ШАПКЕ */}
                <button 
                  onClick={() => navigate('/select-registry')} 
                  className="btn btn-secondary btn-sm"
                  style={{ marginLeft: '10px', fontSize: '12px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Сменить регистр"
                >
                  <span>🔄</span> Сменить регистр
                </button>
              </>
            )}
          </div>
          
          <nav className="nav">
            <Link 
              to="/patients" 
              className={`nav-link ${isActive('/patients') ? 'active' : ''}`}
            >
              Пациенты
            </Link>
            
            {user && user.role === 'admin' && (
              <>
                <Link 
                  to="/dictionaries" 
                  className={`nav-link ${isActive('/dictionaries') ? 'active' : ''}`}
                >
                  Справочники
                </Link>
                <Link 
                  to="/analytics" 
                  className={`nav-link ${isActive('/analytics') ? 'active' : ''}`}
                >
                  Аналитика
                </Link>
                <Link 
                  to="/users" 
                  className={`nav-link ${isActive('/users') ? 'active' : ''}`}
                >
                  Пользователи
                </Link>
                <Link 
                  to="/institutions" 
                  className={`nav-link ${isActive('/institutions') ? 'active' : ''}`}
                >
                  Учреждения
                </Link>
              </>
            )}
          </nav>
          
          <div className="user-menu">
            {user && (
              <>
                <span className="user-name">{user.username}</span>
                <span className="user-institution">{user.institution_name}</span>
              </>
            )}
            <button onClick={onLogout} className="btn btn-secondary btn-sm">
              Выход
            </button>
          </div>
        </div>
      </header>
      
      <main className="main">
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout