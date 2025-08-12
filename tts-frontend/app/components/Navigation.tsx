'use client'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import AuthModal from './AuthModal'
import Link from 'next/link'

export default function Navigation() {
  const { user, logout, isAuthenticated } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  const handleAuthClick = (mode: 'login' | 'register') => {
    console.log('Auth button clicked:', mode)
    setAuthMode(mode)
    setShowAuthModal(true)
    console.log('Modal should show:', true)
  }

  return (
    <>
      <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                🎙️ Gemini TTS
              </Link>
              <div className="hidden md:flex space-x-6">
                <Link href="/tts" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                  TTS Generator
                </Link>
                <Link href="/pricing" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                  Pricing
                </Link>
              </div>
            </div>

                          <div className="flex items-center">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600 hidden sm:block">
                    Welcome, {user?.name}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                    {user?.plan}
                  </span>
                  <button
                    onClick={logout}
                    className="text-gray-700 hover:text-red-600 transition-colors font-medium"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleAuthClick('login')}
                    className="text-gray-700 hover:text-blue-600 transition-colors font-medium px-3 py-2"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => handleAuthClick('register')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          console.log('Closing modal')
          setShowAuthModal(false)
        }}
        initialMode={authMode}
      />
    </>
  )
}