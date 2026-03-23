const BASE = '/api'

function getToken() {
  return localStorage.getItem('eca_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Erro na requisição')
  }
  return res.json()
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: data }),

  // Admin - Schools
  getSchools: () => request('/admin/schools'),
  getSchool: (id) => request(`/admin/schools/${id}`),
  createSchool: (data) => request('/admin/schools', { method: 'POST', body: data }),
  updateSchool: (id, data) => request(`/admin/schools/${id}`, { method: 'PUT', body: data }),
  deleteSchool: (id) => request(`/admin/schools/${id}`, { method: 'DELETE' }),

  // Admin - Users
  getUsers: () => request('/admin/users'),
  createUser: (data) => request('/admin/users', { method: 'POST', body: data }),
  updateUser: (id, data) => request(`/admin/users/${id}`, { method: 'PUT', body: data }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),

  // Admin - Stats
  getAdminStats: () => request('/admin/stats'),

  // Checklist Progress
  getProgress: (schoolId, type) => request(`/checklist/${schoolId}/${type}`),
  saveProgress: (schoolId, type, itemId, data) =>
    request(`/checklist/${schoolId}/${type}/${itemId}`, { method: 'PUT', body: data }),
  getSummary: (schoolId) => request(`/checklist/${schoolId}/summary`),

  // Anamnese
  getAnamnese: (schoolId) => request(`/checklist/${schoolId}/anamnese`),
  saveAnamnese: (schoolId, data) =>
    request(`/checklist/${schoolId}/anamnese`, { method: 'POST', body: data }),
}
