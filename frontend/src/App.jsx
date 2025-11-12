
import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import PatientsPage from './pages/PatientsPage'
import PatientFormPage from './pages/PatientFormPage'
import PatientFormPageNew from './pages/PatientFormPageNew'
import DictionariesPage from './pages/DictionariesPage'
import AnalyticsPage from './pages/AnalyticsPage'
import UserManagementPage from './pages/UserManagementPage'
import InstitutionsPage from './pages/InstitutionsPage'
import Layout from './components/Layout'
import { authService } from './services/authService'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = authService.getCurrentUser()
      if (currentUser) {
        try {
          // Проверяем валидность токена
          const response = await authService.getMe()
          setUser(response)
        } catch (error) {
          authService.logout()
          setUser(null)
        }
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    authService.logout()
    setUser(null)
  }

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Загрузка...</div>
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Navigate to="/patients" replace />} />
          <Route path="/patients" element={<PatientsPage user={user} />} />
          <Route path="/patients/new" element={<PatientFormPageNew user={user} />} />
          <Route path="/patients/:id" element={<PatientFormPageNew user={user} />} />
          {user.role === 'admin' && (
            <>
              <Route path="/dictionaries" element={<DictionariesPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/users" element={<UserManagementPage />} />
              <Route path="/institutions" element={<InstitutionsPage />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/patients" replace />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
