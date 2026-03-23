import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ChecklistPrincipal from './pages/checklist/ChecklistPrincipal'
import ChecklistImplementacao from './pages/checklist/ChecklistImplementacao'
import CriteriosMetodologicos from './pages/criterios/CriteriosMetodologicos'
import MapaRiscos from './pages/riscos/MapaRiscos'
import MapaCalor from './pages/calor/MapaCalor'
import FuncoesAtribuicoes from './pages/funcoes/FuncoesAtribuicoes'
import AdminDashboard from './pages/admin/AdminDashboard'
import Clientes from './pages/admin/Clientes'
import Usuarios from './pages/admin/Usuarios'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

function AdminRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminRedirect />} />
      <Route path="/login" element={<Login />} />

      {/* Client routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/checklist" element={<ProtectedRoute><ChecklistPrincipal /></ProtectedRoute>} />
      <Route path="/implementacao" element={<ProtectedRoute><ChecklistImplementacao /></ProtectedRoute>} />
      <Route path="/criterios" element={<ProtectedRoute><CriteriosMetodologicos /></ProtectedRoute>} />
      <Route path="/riscos" element={<ProtectedRoute><MapaRiscos /></ProtectedRoute>} />
      <Route path="/calor" element={<ProtectedRoute><MapaCalor /></ProtectedRoute>} />
      <Route path="/funcoes" element={<ProtectedRoute><FuncoesAtribuicoes /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/clientes" element={<ProtectedRoute adminOnly><Clientes /></ProtectedRoute>} />
      <Route path="/admin/usuarios" element={<ProtectedRoute adminOnly><Usuarios /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
