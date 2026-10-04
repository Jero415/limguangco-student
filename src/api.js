import axios from 'axios'

const apiBaseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const authStorageKey = 'lavalust-auth'

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

let refreshRequest

function readAuth() {
  try {
    return JSON.parse(localStorage.getItem(authStorageKey) || '{}')
  } catch {
    return {}
  }
}

export function saveAuthTokens(payload) {
  localStorage.setItem(authStorageKey, JSON.stringify({
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
  }))
}

export function clearAuthTokens() {
  localStorage.removeItem(authStorageKey)
}

export function getRefreshToken() {
  return readAuth().refreshToken || ''
}

apiClient.interceptors.request.use((config) => {
  const accessToken = readAuth().accessToken
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const requestUrl = originalRequest?.url || ''

    if (
      error.response?.status !== 401
      || !originalRequest
      || originalRequest._retried
      || ['/login', '/logout', '/refresh'].some((path) => requestUrl.includes(path))
    ) {
      return Promise.reject(error)
    }

    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearAuthTokens()
      return Promise.reject(error)
    }

    originalRequest._retried = true

    try {
      refreshRequest ||= axios.post(`${apiBaseUrl}/refresh`, { refresh_token: refreshToken })
        .then((response) => response.data.tokens)
        .then((tokens) => {
          saveAuthTokens(tokens)
          return tokens.access_token
        })
        .finally(() => { refreshRequest = null })

      const accessToken = await refreshRequest
      originalRequest.headers.Authorization = `Bearer ${accessToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      clearAuthTokens()
      return Promise.reject(refreshError)
    }
  },
)

export async function apiRequest(path, options = {}) {
  try {
    const response = await apiClient.request({ url: path, ...options })
    return response.data
  } catch (error) {
    const responseError = error.response
    const serverMessage = responseError?.data?.error

    if (responseError) {
      const method = (options.method || 'GET').toUpperCase()
      throw new Error(`${method} ${apiBaseUrl}${path} failed (${responseError.status}): ${serverMessage || 'The server returned an error.'}`)
    }

    throw new Error(error.message || 'The request could not be completed.')
  }
}