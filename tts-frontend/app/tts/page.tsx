'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Play, Download, Square, Mic, User, LogOut, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import Navigation from '../components/Navigation'
import AuthModal from '../components/AuthModal'

interface Language {
  code: string
  name: string
  voiceCount: number
}

interface Voice {
  id: string
  name: string
  displayName: string
  languageCode: string
}

interface UserStatus {
  authenticated: boolean
  plan: string
  planName: string
  usage: {
    monthlyCharacters: number
    monthlyCharactersLimit: number
    charactersRemaining: string | number
  }
  user: {
    name: string
    email: string
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function TTSPage() {
  const { user, token, isAuthenticated, logout } = useAuth()
  
  // TTS State
  const [text, setText] = useState('Hello! This is a demonstration of the Gemini 2.5 Flash Preview TTS interface with advanced AI-generated voices including Puck, Charon, Kore, Fenrir, and Aoede.')
  const [languages, setLanguages] = useState<Language[]>([])
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('')
  const [speed, setSpeed] = useState([1])
  const [pitch, setPitch] = useState([1])
  const [volume, setVolume] = useState([1])
  
  // Audio State
  const [audioUrl, setAudioUrl] = useState('')
  const [audioId, setAudioId] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  
  // UI State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Initialize app
  useEffect(() => {
    initializeApp()
  }, [])

  // Update user status when auth context changes
  useEffect(() => {
    if (isAuthenticated && user) {
      setUserStatus({
        authenticated: true,
        plan: user.plan,
        planName: user.plan.charAt(0).toUpperCase() + user.plan.slice(1),
        usage: {
          monthlyCharacters: 0,
          monthlyCharactersLimit: user.plan === 'free' ? 1000 : -1,
          charactersRemaining: user.plan === 'free' ? 1000 : 'Unlimited'
        },
        user: {
          name: user.name,
          email: user.email
        }
      })
    } else {
      setUserStatus(null)
    }
  }, [isAuthenticated, user])

  // Update audio volume when slider changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0]
    }
  }, [volume])

  const initializeApp = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Check server health
      const healthResponse = await fetch(`${API_BASE}/api/health`)
      const healthData = await healthResponse.json()
      
      if (!healthData.success || !healthData.ttsAvailable) {
        throw new Error('Gemini 2.5 Flash Preview TTS service not available')
      }
      
      // Load languages
      await loadLanguages()
      setSuccess('Ready to generate speech!')
      
    } catch (error: any) {
      console.error('Initialization error:', error)
      setError(`Initialization failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadLanguages = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/languages`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load languages')
      }
      
      setLanguages(data.languages)
      
      // Auto-select English if available
      const englishLang = data.languages.find((lang: Language) => lang.code.startsWith('en-US'))
      if (englishLang) {
        setSelectedLanguage(englishLang.code)
        await loadVoices(englishLang.code)
      }
      
    } catch (error: any) {
      console.error('Error loading languages:', error)
      setError(`Failed to load languages: ${error.message}`)
    }
  }

  const loadVoices = async (languageCode: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/voices/${languageCode}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load voices')
      }
      
      setVoices(data.voices)
      
      // Auto-select first voice
      if (data.voices.length > 0) {
        setSelectedVoice(data.voices[0].id)
      }
      
    } catch (error: any) {
      console.error('Error loading voices:', error)
      setError(`Failed to load voices: ${error.message}`)
    }
  }

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode)
    setSelectedVoice('')
    loadVoices(languageCode)
  }

  const generateSpeech = async () => {
    if (!text.trim()) {
      setError('Please enter some text to convert')
      return
    }

    if (text.length > 5000) {
      setError('Text is too long. Please limit to 5000 characters.')
      return
    }

    if (!selectedLanguage || !selectedVoice) {
      setError('Please select a language and voice')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (isAuthenticated && token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE}/api/generate-speech`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text,
          voiceId: selectedVoice,
          languageCode: selectedLanguage,
          speed: speed[0],
          pitch: pitch[0] - 1.0 // Convert to -1 to +1 range
        })
      })

      const data = await response.json()
      
      if (!data.success) {
        if (response.status === 429) {
          setError(`${data.error} Please upgrade your plan for more usage.`)
        } else if (response.status === 403) {
          setError(`${data.error} Please select an available voice or upgrade your plan.`)
        } else if (response.status === 401) {
          setError('Please sign in to use this feature.')
          setShowAuthModal(true)
        } else {
          throw new Error(data.error || 'Failed to generate speech')
        }
        return
      }
      
      setAudioId(data.audioId)
      setAudioUrl(`${API_BASE}${data.url}`)
      
      let successMessage = `Speech generated successfully using ${data.voice}!`
      if (data.charactersUsed && data.remainingCharacters !== null) {
        if (data.remainingCharacters === 'Unlimited') {
          successMessage += ` (${data.charactersUsed} characters used)`
        } else {
          successMessage += ` (${data.charactersUsed} characters used, ${data.remainingCharacters} remaining)`
        }
      }
      
      setSuccess(successMessage)
      
    } catch (error: any) {
      console.error('Speech generation error:', error)
      setError(`Generation failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const downloadAudio = () => {
    if (!audioId) {
      setError('No audio available for download')
      return
    }

    const downloadUrl = `${API_BASE}/api/download/${audioId}`
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `gemini-tts-${audioId}.wav`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    setSuccess('Download started!')
  }

  const handleLogout = () => {
    logout()
    setUserStatus(null)
    setSuccess('Logged out successfully')
  }

  const getUsagePercentage = () => {
    if (!userStatus?.usage) return 0
    const { monthlyCharacters, monthlyCharactersLimit } = userStatus.usage
    if (monthlyCharactersLimit === -1) return 0
    return Math.min(100, (monthlyCharacters / monthlyCharactersLimit) * 100)
  }

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* User Status Widget */}
          {userStatus?.authenticated && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="text-sm font-medium">Welcome, {userStatus.user.name}!</p>
                      <p className="text-xs text-gray-500">Plan: {userStatus.planName}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600">
                        {userStatus.usage.monthlyCharacters} / {userStatus.usage.monthlyCharactersLimit === -1 ? '∞' : userStatus.usage.monthlyCharactersLimit} chars
                      </span>
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${getUsagePercentage()}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <Link href="/pricing">
                    <Button variant="outline" size="sm">
                      {getUsagePercentage() > 80 ? 'Upgrade Plan' : 'Manage Plan'}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main TTS Interface */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mic className="h-5 w-5 mr-2" />
                Gemini TTS Voice Generator
              </CardTitle>
              <CardDescription>
                Convert your text to natural-sounding speech using Gemini 2.5 Flash Preview TTS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Text Input */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Text to Convert ({text.length}/5000 characters)
                </label>
                <Textarea
                  placeholder="Enter the text you want to convert to speech..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  maxLength={5000}
                  className="resize-none"
                />
              </div>

              {/* Language and Voice Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Language</label>
                  <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name} ({lang.voiceCount} voices)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Voice</label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Audio Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Speed: {speed[0]}x
                  </label>
                  <Slider
                    value={speed}
                    onValueChange={setSpeed}
                    max={2}
                    min={0.1}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Pitch: {pitch[0]}x
                  </label>
                  <Slider
                    value={pitch}
                    onValueChange={setPitch}
                    max={2}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Volume: {volume[0]}
                  </label>
                  <Slider
                    value={volume}
                    onValueChange={setVolume}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={generateSpeech} 
                  disabled={loading || !text.trim()}
                  size="lg"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Mic className="mr-2 h-4 w-4" />
                  Generate Speech
                </Button>
                
                {audioUrl && (
                  <>
                    <Button variant="outline" onClick={playAudio} size="lg">
                      {isPlaying ? <Square className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                      {isPlaying ? 'Stop' : 'Play'}
                    </Button>
                    
                    <Button variant="outline" onClick={downloadAudio} size="lg">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </>
                )}
              </div>

              {/* Status Messages */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {/* Audio Player */}
              {audioUrl && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-medium mb-3">Generated Audio</h3>
                  <audio 
                    ref={audioRef}
                    controls 
                    className="w-full"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  >
                    <source src={audioUrl} type="audio/wav" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {/* Info Note */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-2">🚀 Gemini 2.5 Flash Preview TTS</h3>
                <div className="text-sm text-yellow-700 space-y-1">
                  <p><strong>Latest AI Voices:</strong> Experience state-of-the-art AI voices including Puck, Charon, Kore, Fenrir, and Aoede</p>
                  <p><strong>Pricing Plans:</strong> Free (1,000 chars), Starter (₹499), Pro (₹1,499), Enterprise (₹4,999)</p>
                  <p><strong>Features:</strong> Ultra-fast generation, enhanced natural speech, improved emotional expression</p>
                  {!isAuthenticated ? (
                    <Button 
                      variant="link" 
                      className="text-blue-600 font-medium hover:underline p-0 h-auto"
                      onClick={() => setShowAuthModal(true)}
                    >
                      → Sign Up for Full Access
                    </Button>
                  ) : (
                    <Link href="/pricing" className="text-blue-600 font-medium hover:underline">
                      → View Pricing Plans & Upgrade
                    </Link>
                  )}
                </div>
              </div>

              {/* Free Trial CTA for Non-Authenticated Users */}
              {!isAuthenticated && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      🎉 Free Trial: Try advanced voices with full controls!
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Sign up for unlimited access to premium voices, advanced controls, and download features!
                    </p>
                    <div className="space-x-4">
                      <Button
                        onClick={() => setShowAuthModal(true)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-medium"
                      >
                        Sign Up for Premium Features →
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-4">
                      Experience the latest in AI voice technology with premium features.<br/>
                      Start free, upgrade when you need more.<br/>
                      Join thousands of users creating amazing voice content with Gemini TTS.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="register"
      />
    </>
  )
}
