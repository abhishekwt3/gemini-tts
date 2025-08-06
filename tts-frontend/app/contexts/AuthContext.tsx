'use client'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string
  plan: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => void
  loading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// API base URL
const API_BASE_URL = 'http://localhost:3000'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored token on app load
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('user_data')
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Error parsing stored user data:', error)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('Login function called with email:', email)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      console.log('Login response status:', response.status)

      if (!response.ok) {
        console.error('Login failed with status:', response.status)
        return false
      }

      const data = await response.json()
      console.log('Login response data:', data)

      if (data.success) {
        setToken(data.token)
        setUser(data.user)
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user_data', JSON.stringify(data.user))
        return true
      }
      console.log('Login failed:', data.message || 'Unknown error')
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    console.log('Register function called with email:', email)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      })

      console.log('Register response status:', response.status)

      if (!response.ok) {
        console.error('Registration failed with status:', response.status)
        return false
      }

      const data = await response.json()
      console.log('Register response data:', data)

      if (data.success) {
        setToken(data.token)
        setUser(data.user)
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user_data', JSON.stringify(data.user))
        return true
      }
      console.log('Registration failed:', data.message || 'Unknown error')
      return false
    } catch (error) {
      console.error('Registration error:', error)
      return false
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        loading,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
