const API_BASE_URL = 'http://localhost:3000'

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token')
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    })

    if (response.status === 401) {
      // Token expired, clear storage and redirect
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
      window.location.reload()
      return null
    }

    return response
  } catch (error) {
    console.error('API call error:', error)
    throw error
  }
}

// Helper functions for common API calls
export const fetchUserDashboard = async () => {
  const response = await apiCall('/api/user/dashboard')
  if (response?.ok) {
    return await response.json()
  }
  return null
}

export const fetchLanguages = async () => {
  const response = await apiCall('/api/languages')
  if (response?.ok) {
    return await response.json()
  }
  return null
}

export const fetchVoices = async (lang: string) => {
  const response = await apiCall(`/api/voices/${lang}`)
  if (response?.ok) {
    return await response.json()
  }
  return null
}

export const generateSpeech = async (text: string, voice: string) => {
  const response = await apiCall('/api/generate-speech', {
    method: 'POST',
    body: JSON.stringify({ text, voice }),
  })
  if (response?.ok) {
    return await response.json()
  }
  return null
}
