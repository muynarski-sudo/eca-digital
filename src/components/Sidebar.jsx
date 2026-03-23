import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, ClipboardList, Wrench, Target, Thermometer,
  Users, BookOpen, Shield, LogOut, Building2, UserCog, ChevronRight,
  FileSignature, ClipboardCheck, Grid2x2, FileText
} from 'lucide-react'

const clientNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/anamnese', icon: ClipboardCheck, label: 'Diagnóstico Inicial' },
  { to: '/checklist', icon: ClipboardList, label: 'Protocolo ECA Escolar' },
  { to: '/implementacao', icon: Wrench, label: 'Plano de Implementação' },
  { to: '/risco4cs', icon: Grid2x2, label: 'Matriz 4 Cs' },
  { to: '/documentos', icon: FileText, label: 'Documentos' },
  { to: '/edtech', icon: FileSignature, label: 'EdTech Contratual' },
  { to: '/criterios', icon: BookOpen, label: 'Critérios Metodológicos' },
  { to: '/riscos', icon: Target, label: 'Mapa de Riscos' },
  { to: '/calor', icon: Thermometer, label: 'Mapa de Calor' },
  { to: '/funcoes', icon: Users, label: 'Funções e Atribuições' },
]

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Painel Admin' },
  { to: '/admin/clientes', icon: Building2, label: 'Clientes / Escolas' },
  { to: '/admin/usuarios', icon: UserCog, label: 'Usuários' },
]

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const nav = isAdmin ? adminNav : clientNav

  return (
    <aside className="no-print flex flex-col w-64 min-h-screen bg-brand-900 text-white">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-brand-700">
        <div className="flex items-center gap-2">
          <Shield className="w-7 h-7 text-brand-300" />
          <div>
            <p className="font-bold text-sm leading-tight">ECA Digital</p>
            <p className="text-brand-400 text-xs">Compliance Educacional</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-brand-700">
        <p className="text-xs text-brand-400 uppercase tracking-wide mb-1">
          {isAdmin ? 'Administrador' : 'Escola / EdTech'}
        </p>
        <p className="text-sm font-semibold truncate">{user?.name}</p>
        {user?.school_name && (
          <p className="text-xs text-brand-400 truncate mt-0.5">{user.school_name}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-0.5 px-3">
          {nav.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/dashboard' || to === '/admin'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white font-medium'
                      : 'text-brand-200 hover:bg-brand-700 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* If admin, also show quick link to client view */}
        {isAdmin && (
          <div className="mt-4 px-3">
            <p className="text-xs text-brand-500 uppercase px-3 mb-1">Visualizar como</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-300 hover:bg-brand-700 hover:text-white w-full transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
              <span>Visão de Escola</span>
            </button>
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-brand-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-300 hover:bg-red-700 hover:text-white w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
