const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const request = async (path, options = {}) => {
  const headers = { ...(options.multipart ? {} : { 'Content-Type': 'application/json' }), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) }
  const response = await fetch(`${API_URL}${path}`, {
    headers,
    ...options,
    body: options.body ? (options.multipart ? options.body : JSON.stringify(options.body)) : undefined,
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Request failed.')
  return data
}

export const fetchHomes = (filters = {}) => {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value && !value.startsWith('All '))).toString()
  return request(`/homes${query ? `?${query}` : ''}`)
}

export const registerUser = (account) => request('/auth/register', { method: 'POST', body: account })
export const loginUser = (credentials) => request('/auth/login', { method: 'POST', body: credentials })
export const createBooking = (homeId, token) => request('/bookings', { method: 'POST', body: { homeId }, token })
export const fetchBookings = (token) => request('/bookings', { token })
export const cancelBooking = (id, token) => request(`/bookings/${id}/cancel`, { method: 'PATCH', token })
export const fetchManagedHomes = (token) => request('/agent/homes', { token })
export const createHome = (home, token) => request('/agent/homes', { method: 'POST', body: home, token })
export const updateHomeAvailability = (id, available, token) => request(`/agent/homes/${id}/status`, { method: 'PATCH', body: { available }, token })
export const uploadHouseImage = (file, token) => {
  const body = new FormData()
  body.append('image', file)
  return request('/uploads/house-image', { method: 'POST', body, token, multipart: true })
}
export const uploadPdf = (file, token) => {
  const body = new FormData()
  body.append('document', file)
  return request('/uploads/document', { method: 'POST', body, token, multipart: true })
}
export const fetchProfile = (token) => request('/profile', { token })
export const updateProfile = (profile, token) => request('/profile', { method: 'PATCH', body: profile, token })
export const submitApplication = (homeId, message, token) => request('/applications', { method: 'POST', body: { homeId, message }, token })
export const fetchMyApplications = (token) => request('/applications/mine', { token })
export const fetchAgentApplications = (token) => request('/agent/applications', { token })
export const reviewApplication = (id, review, token) => request(`/agent/applications/${id}`, { method: 'PATCH', body: review, token })
export const requestPayment = (id, phone, amount, token) => request(`/applications/${id}/payment`, { method: 'PATCH', body: { phone, amount }, token })
export const cancelApplication = (id, token) => request(`/applications/${id}/cancel`, { method: 'PATCH', token })
export const fetchSuperAdminOverview = (token) => request('/superadmin/overview', { token })
export const fetchSuperAdminUsers = (token) => request('/superadmin/users', { token })
export const updateSuperAdminUserRole = (id, role, token) => request(`/superadmin/users/${id}/role`, { method: 'PATCH', body: { role }, token })
export const deleteSuperAdminUser = (id, token) => request(`/superadmin/users/${id}`, { method: 'DELETE', token })
