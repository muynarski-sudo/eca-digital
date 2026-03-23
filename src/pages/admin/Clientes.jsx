import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import Layout from '../../components/Layout'
import { Plus, Pencil, Trash2, X, Save, Building2, Search } from 'lucide-react'

const emptyForm = { name: '', cnpj: '', type: 'escola', email: '', phone: '', responsible: '', city: '', state: '', notes: '' }

export default function Clientes() {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | 'edit'
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setSchools(await api.getSchools()) } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  function openCreate() {
    setForm(emptyForm)
    setEditId(null)
    setModal('create')
  }

  function openEdit(s) {
    setForm({ name: s.name, cnpj: s.cnpj || '', type: s.type, email: s.email || '', phone: s.phone || '',
               responsible: s.responsible || '', city: s.city || '', state: s.state || '', notes: s.notes || '' })
    setEditId(s.id)
    setModal('edit')
  }

  async function save() {
    setSaving(true)
    try {
      if (modal === 'create') {
        await api.createSchool(form)
      } else {
        await api.updateSchool(editId, form)
      }
      setModal(null)
      load()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  async function remove(id, name) {
    if (!confirm(`Remover "${name}"? Os dados de compliance serão mantidos.`)) return
    try { await api.deleteSchool(id); load() } catch (err) { alert(err.message) }
  }

  const filtered = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.responsible || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout title="Clientes / Escolas" subtitle="Cadastro de escolas e EdTechs no sistema">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar escola..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors">
          <Plus className="w-4 h-4" /> Nova Escola
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma escola cadastrada.</p>
          <button onClick={openCreate} className="mt-3 text-brand-600 text-sm font-medium hover:text-brand-700">
            Adicionar primeira escola →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-200 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      s.type === 'edtech' ? 'bg-brand-100 text-brand-700' : 'bg-green-100 text-green-700'
                    }`}>{s.type}</span>
                  </div>
                  {s.responsible && <p className="text-xs text-gray-500">Responsável: {s.responsible}</p>}
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  <button onClick={() => openEdit(s)}
                    className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(s.id, s.name)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs text-gray-500">
                {s.cnpj && <p>CNPJ: {s.cnpj}</p>}
                {s.email && <p>Email: {s.email}</p>}
                {s.phone && <p>Telefone: {s.phone}</p>}
                {(s.city || s.state) && <p>Localização: {[s.city, s.state].filter(Boolean).join(' - ')}</p>}
              </div>

              {s.user_count > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">{s.user_count} usuário{s.user_count > 1 ? 's' : ''} ativo{s.user_count > 1 ? 's' : ''}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {modal === 'create' ? 'Nova Escola / EdTech' : 'Editar Escola'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Tipo *</label>
                <div className="flex gap-3">
                  {[{ value: 'escola', label: '🏫 Escola' }, { value: 'edtech', label: '💻 EdTech' }].map(opt => (
                    <button key={opt.value} onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.type === opt.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {[
                { key: 'name', label: 'Nome *', placeholder: 'Colégio / EdTech...' },
                { key: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0001-00' },
                { key: 'responsible', label: 'Responsável / DPO', placeholder: 'Nome do responsável' },
                { key: 'email', label: 'Email de contato', placeholder: 'contato@escola.com.br', type: 'email' },
                { key: 'phone', label: 'Telefone', placeholder: '(11) 99999-0000' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">{label}</label>
                  <input
                    type={type || 'text'}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Cidade</label>
                  <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="São Paulo"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Estado</label>
                  <input type="text" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                    placeholder="SP"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Observações</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm">
                Cancelar
              </button>
              <button onClick={save} disabled={saving || !form.name}
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
