import React, { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useRegistry } from '../contexts/RegistryContext'
import './Layout.css'

function Layout({ user, onLogout, children }) {
  const location = useLocation()
  const { registryType, getRegistryColor, getRegistryName } = useRegistry()

  const isActive = (path) => location.pathname === path

  // Динамически обновляем CSS переменную --primary-color
  useEffect(() => {
    if (registryType) {
      const primaryColor = getRegistryColor()
      document.documentElement.style.setProperty('--primary-color', primaryColor)
    }
  }, [registryType, getRegistryColor])

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="header-title-container">
            <h1 className="header-title">{getRegistryName()}</h1>
            {registryType && (
              <span 
                className="registry-badge"
                style={{ backgroundColor: getRegistryColor() }}
              >
                {registryType}
              </span>
            )}
          </div>
          <nav className="nav">
            <Link 
              to="/patients" 
              className={`nav-link ${isActive('/patients') ? 'active' : ''}`}
            >
              Пациенты
            </Link>
            {user.role === 'admin' && (
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
            <span className="user-name">{user.username}</span>
            <span className="user-institution">{user.institution_name}</span>
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
