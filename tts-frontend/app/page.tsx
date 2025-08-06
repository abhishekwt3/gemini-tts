'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Slider } from '@/components/ui/slider'
import { Play, Download, Mic, User, LogIn, Settings, Volume2, Loader2, AlertCircle, CheckCircle, Star, ArrowRight, Zap, Shield, Headphones } from 'lucide-react'

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
  plan?: string
  planName?: string
  usage?: {
    monthlyCharacters: number
    monthlyCharactersLimit: number
    charactersRemaining: string | number
  }
  user?: {
    name: string
    email: string
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function LandingPage() {
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
  const [userStatus, setUserStatus] = useState<UserStatus>({ authenticated: false })
  const [showTrySection, setShowTrySection] = useState(false)

  // Initialize app
  useEffect(() => {
    initializeApp()
  }, [])

  // Update audio volume when slider changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0]
    }
  }, [volume])

  const initializeApp = async () => {
    try {
      // Check authentication status (optional)
      await checkAuthenticationStatus()
      
      // Load languages for demo
      await loadLanguages()
      
    } catch (error: any) {
      console.error('Initialization error:', error)
      // Don't show error for guest users, just continue
    }
  }

  const checkAuthenticationStatus = async () => {
    const token = localStorage.getItem('tts_token')
    if (!token) return

    try {
      const response = await fetch(`${API_BASE}/api/user/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setUserStatus({
          authenticated: true,
          plan: data.dashboard.subscription.plan,
          planName: data.dashboard.subscription.planName,
          usage: data.dashboard.usage,
          user: data.dashboard.user
        })
      } else {
        localStorage.removeItem('tts_token')
      }
    } catch (error) {
      console.error('Authentication check failed:', error)
    }
  }

  const loadLanguages = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/languages`)
      const data = await response.json()
      
      if (data.success) {
        setLanguages(data.languages)
        
        // Auto-select English if available
        const englishLang = data.languages.find((lang: Language) => lang.code.startsWith('en-US'))
        if (englishLang) {
          setSelectedLanguage(englishLang.code)
          await loadVoices(englishLang.code)
        }
      }
    } catch (error: any) {
      console.error('Error loading languages:', error)
    }
  }

  const loadVoices = async (languageCode: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/voices/${languageCode}`)
      const data = await response.json()
      
      if (data.success) {
        setVoices(data.voices)
        
        // Auto-select first voice (usually Puck for free users)
        if (data.voices.length > 0) {
          setSelectedVoice(data.voices[0].id)
        }
      }
    } catch (error: any) {
      console.error('Error loading voices:', error)
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

      // Add auth header if user is logged in
      const token = localStorage.getItem('tts_token')
      if (token) {
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
          pitch: pitch[0] - 1.0
        })
      })

      const data = await response.json()
      
      if (!data.success) {
        if (response.status === 429) {
          setError(`${data.error} Sign up for more usage!`)
        } else if (response.status === 403) {
          setError(`${data.error} Sign up to access premium voices!`)
        } else {
          throw new Error(data.error || 'Failed to generate speech')
        }
        return
      }
      
      setAudioId(data.audioId)
      setAudioUrl(`${API_BASE}${data.url}`)
      
      let successMessage = `Speech generated successfully using ${data.voice}!`
      if (data.charactersUsed) {
        if (userStatus.authenticated) {
          successMessage += ` (${data.charactersUsed} characters used)`
        } else {
          successMessage += ` Try signing up for more features!`
        }
      }
      
      setSuccess(successMessage)
      
      // Refresh user status if authenticated
      if (userStatus.authenticated) {
        await checkAuthenticationStatus()
      }
      
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
    localStorage.removeItem('tts_token')
    setUserStatus({ authenticated: false })
    setSuccess('Logged out successfully')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Mic className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Gemini TTS</h1>
            </div>
            <div className="flex items-center space-x-4">
              {userStatus.authenticated ? (
                <>
                  <Badge variant="outline">
                    {userStatus.planName}
                  </Badge>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{userStatus.user?.name}</span>
                  </div>
                  <Link href="/tts">
                    <Button variant="outline" size="sm">
                      Dashboard
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/pricing">
                    <Button variant="outline" size="sm">
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="sm">
                      Sign Up Free
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Mic className="h-16 w-16 text-blue-600" />
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  NEW
                </div>
              </div>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Gemini TTS Voice Generator
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Convert your text to natural-sounding speech using Gemini 2.5 Flash Preview TTS with advanced AI-generated voices. Try it free - no signup required!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                size="lg" 
                className="text-lg px-8 py-3"
                onClick={() => setShowTrySection(true)}
              >
                <Play className="mr-2 h-5 w-5" />
                Try It Free Now
              </Button>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                  <Star className="mr-2 h-5 w-5" />
                  View Pricing Plans
                </Button>
              </Link>
            </div>
            
            {/* Guest Usage Notice */}
            {!userStatus.authenticated && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
                <p className="text-blue-800 text-sm">
                  🎯 <strong>Free Trial:</strong> Try basic voices (Puck, Kore) without signing up. 
                  <Link href="/pricing" className="text-blue-600 font-medium hover:underline ml-1">
                    Sign up for premium voices and unlimited usage →
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Try It Section */}
      {showTrySection && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Volume2 className="h-5 w-5 mr-2" />
                Try Gemini TTS - Free Demo
              </CardTitle>
              <CardDescription>
                Experience the power of AI voice generation. No signup required for basic features!
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
                  rows={4}
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
                  <label className="text-sm font-medium mb-2 block">
                    Voice {!userStatus.authenticated && <span className="text-xs text-gray-500">(Basic voices only)</span>}
                  </label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.displayName}
                          {!userStatus.authenticated && !['Puck', 'Kore'].some(name => voice.name.includes(name)) && (
                            <Badge variant="outline" className="ml-2 text-xs">Premium</Badge>
                          )}
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

              {/* Generate Button */}
              <Button 
                onClick={generateSpeech} 
                disabled={loading || !text.trim()}
                className="w-full"
                size="lg"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Mic className="mr-2 h-4 w-4" />
                Generate Speech {!userStatus.authenticated && '(Free)'}
              </Button>

              {/* Status Messages */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                    {error.includes('Sign up') && (
                      <Link href="/pricing" className="ml-2 text-blue-600 hover:underline font-medium">
                        Sign up now →
                      </Link>
                    )}
                  </AlertDescription>
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
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Generated Audio</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={playAudio}>
                        {isPlaying ? 'Pause' : 'Play'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={downloadAudio}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
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

              {/* Upgrade Prompt for Guests */}
              {!userStatus.authenticated && audioUrl && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900">Love what you hear?</h4>
                      <p className="text-sm text-blue-700">Sign up for premium voices, unlimited usage, and more features!</p>
                    </div>
                    <Link href="/pricing">
                      <Button size="sm">
                        Upgrade Now
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose Gemini TTS?
          </h2>
          <p className="text-lg text-gray-600">
            Experience the latest in AI voice technology with premium features
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardHeader>
              <Headphones className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Premium AI Voices</CardTitle>
              <CardDescription>
                Access to state-of-the-art AI voices including Puck, Charon, Kore, Fenrir, and Aoede with authentic emotional expression
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Zap className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Ultra-Fast Generation</CardTitle>
              <CardDescription>
                Powered by Gemini 2.5 Flash Preview for lightning-fast speech generation with enhanced natural speech patterns
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>High-Quality Audio</CardTitle>
              <CardDescription>
                Download your generated speech in high-quality WAV format (24kHz, 16-bit, Mono) for professional use
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Pricing Preview */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Flexible Pricing Plans
            </h2>
            <p className="text-lg text-gray-600">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Free Trial</CardTitle>
                <div className="text-2xl font-bold">₹0</div>
                <CardDescription>Try without signup</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Basic voices (Puck, Kore)</li>
                  <li>• Limited usage</li>
                  <li>• No registration required</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <CardTitle>Free Plan</CardTitle>
                <div className="text-2xl font-bold">₹0</div>
                <CardDescription>1,000 characters/month</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Basic voices (Puck, Kore)</li>
                  <li>• Standard quality audio</li>
                  <li>• Email support</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-blue-500 border-2 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Most Popular
                </span>
              </div>
              <CardHeader className="text-center">
                <CardTitle>Starter</CardTitle>
                <div className="text-2xl font-bold">₹499</div>
                <CardDescription>25,000 characters/month</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• All voices (Puck, Charon, Kore)</li>
                  <li>• High quality audio</li>
                  <li>• Priority support</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <CardTitle>Pro</CardTitle>
                <div className="text-2xl font-bold">₹1,499</div>
                <CardDescription>100,000 characters/month</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Premium voices (+ Fenrir, Aoede)</li>
                  <li>• Ultra-high quality</li>
                  <li>• API access</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Link href="/pricing">
              <Button size="lg">
                View All Plans & Sign Up
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of users creating amazing voice content with Gemini TTS
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-lg px-8 py-3"
              onClick={() => setShowTrySection(true)}
            >
              <Mic className="mr-2 h-5 w-5" />
              Try Free Now
            </Button>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-lg px-8 py-3 text-white border-white hover:bg-white hover:text-blue-600">
                <Star className="mr-2 h-5 w-5" />
                Choose Your Plan
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
