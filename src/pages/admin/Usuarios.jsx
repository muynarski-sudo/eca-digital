import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import Layout from '../../components/Layout'
import { Plus, Pencil, Trash2, X, Save, UserCog, Search, Eye, EyeOff } from 'lucide-react'

const emptyForm = { name: '', email: '', password: '', role: 'client', school_id: '', active: 1 }

export default function Usuarios() {
  const [users, setUsers] = useState([])
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [u, s] = await Promise.all([api.getUsers(), api.getSchools()])
      setUsers(u)
      setSchools(s)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  function openCreate() {
    setForm(emptyForm)
    setEditId(null)
    setModal('create')
    setShowPwd(false)
  }

  function openEdit(u) {
    setForm({ name: u.name, email: u.email, password: '', role: u.role,
               school_id: u.school_id || '', active: u.active })
    setEditId(u.id)
    setModal('edit')
    setShowPwd(false)
  }

  async function save() {
    setSaving(true)
    try {
      const payload = { ...form, school_id: form.school_id || null }
      if (modal === 'create') {
        await api.createUser(payload)
      } else {
        if (!payload.password) delete payload.password
        await api.updateUser(editId, payload)
      }
      setModal(null)
      load()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  async function remove(id, name) {
    if (!confirm(`Desativar usuário "${name}"?`)) return
    try { await api.deleteUser(id); load() } catch (err) { alert(err.message) }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.school_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const roleColor = { admin: 'bg-red-100 text-red-700', client: 'bg-blue-100 text-blue-700' }
  const roleLabel = { admin: 'Admin', client: 'Escola' }

  return (
    <Layout title="Usuários" subtitle="Controle de acesso ao sistema">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar usuário..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors">
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Carregando...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <UserCog className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Perfil</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Escola</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[u.role] || 'bg-gray-100 text-gray-600'}`}>
                        {roleLabel[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.school_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(u)}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => remove(u.id, u.name)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {modal === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {[
                { key: 'name', label: 'Nome *', placeholder: 'Nome completo' },
                { key: 'email', label: 'Email *', placeholder: 'email@escola.com.br', type: 'email' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">{label}</label>
                  <input type={type || 'text'} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              ))}

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">
                  {modal === 'edit' ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
                </label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Perfil *</label>
                <div className="flex gap-3">
                  {[{ value: 'client', label: 'Escola / EdTech' }, { value: 'admin', label: 'Administrador' }].map(opt => (
                    <button key={opt.value} onClick={() => setForm(f => ({ ...f, role: opt.value }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.role === opt.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.role === 'client' && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Escola *</label>
                  <select value={form.school_id} onChange={e => setForm(f => ({ ...f, school_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Selecione uma escola...</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {modal === 'edit' && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Status</label>
                  <div className="flex gap-3">
                    {[{ value: 1, label: '✓ Ativo' }, { value: 0, label: '✗ Inativo' }].map(opt => (
                      <button key={opt.value} onClick={() => setForm(f => ({ ...f, active: opt.value }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          form.active === opt.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm">
                Cancelar
              </button>
              <button onClick={save} disabled={saving || !form.name || !form.email || (modal === 'create' && !form.password)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-60">
                <Save className="w-4 h-4" />{saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
