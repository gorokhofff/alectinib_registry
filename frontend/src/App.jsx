import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SelectRegistryPage from './pages/SelectRegistryPage'
import PatientsPage from './pages/PatientsPage'
import PatientFormPage from './pages/PatientFormPage'
import PatientFormPageNew from './pages/PatientFormPageNew'
import DictionariesPage from './pages/DictionariesPage'
import AnalyticsPage from './pages/AnalyticsPage'
import UserManagementPage from './pages/UserManagementPage'
import InstitutionsPage from './pages/InstitutionsPage'
import TherapyBuilderTestPage from './pages/TherapyBuilderTestPage' // Только для разработки
import Layout from './components/Layout'
import { authService } from './services/authService'
import { RegistryProvider, useRegistry } from './contexts/RegistryContext'

/**
 * Protected Route component that checks if registry is selected
 */
function ProtectedRoute({ children }) {
  const { isRegistrySelected } = useRegistry()
  
  if (!isRegistrySelected()) {
    return <Navigate to="/select-registry" replace />
  }
  
  return children
}

function AppContent() {
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
      <Routes>
        {/* Страница выбора регистра - доступна без Layout */}
        <Route path="/select-registry" element={<SelectRegistryPage />} />
        
        {/* Все остальные маршруты с Layout и защитой */}
        <Route
          path="/*"
          element={
            <Layout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<Navigate to="/select-registry" replace />} />
                
                {/* Защищенные маршруты - требуют выбора регистра */}
                <Route
                  path="/patients"
                  element={
                    <ProtectedRoute>
                      <PatientsPage user={user} />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/patients/new"
                  element={
                    <ProtectedRoute>
                      <PatientFormPageNew user={user} />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/patients/:id"
                  element={
                    <ProtectedRoute>
                      <PatientFormPageNew user={user} />
                    </ProtectedRoute>
                  }
                />
                
                {/* Админские маршруты */}
                {user.role === 'admin' && (
                  <>
                    <Route
                      path="/dictionaries"
                      element={
                        <ProtectedRoute>
                          <DictionariesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/analytics"
                      element={
                        <ProtectedRoute>
                          <AnalyticsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/users"
                      element={
                        <ProtectedRoute>
                          <UserManagementPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/institutions"
                      element={
                        <ProtectedRoute>
                          <InstitutionsPage />
                        </ProtectedRoute>
                      }
                    />
                  </>
                )}
                
                {/* Тестовая страница TherapyBuilder (только для разработки) */}
                <Route
                  path="/test/therapy-builder"
                  element={
                    <ProtectedRoute>
                      <TherapyBuilderTestPage />
                    </ProtectedRoute>
                  }
                />
                
                <Route path="*" element={<Navigate to="/select-registry" replace />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </Router>
  )
}

function App() {
  return (
    <RegistryProvider>
      <AppContent />
    </RegistryProvider>
  )
}

export default App
