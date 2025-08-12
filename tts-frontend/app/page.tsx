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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Play, Download, Square, Mic, User, LogOut, AlertCircle, CheckCircle, Loader2, FileText, Youtube, Megaphone, Package, Video, Copy, Sparkles, Zap, Star, Crown } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from './contexts/AuthContext'
import Navigation from './components/Navigation'
import AuthModal from './components/AuthModal'

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

const SCRIPT_TYPES = [
  { id: 'youtube', name: 'YouTube Video', icon: Youtube, description: 'Engaging scripts for YouTube content' },
  { id: 'advertising', name: 'Advertisement', icon: Megaphone, description: 'Compelling advertising copy' },
  { id: 'product_demo', name: 'Product Demo', icon: Package, description: 'Product demonstration scripts' },
  { id: 'reel', name: 'Social Media Reel', icon: Video, description: 'Short-form social content' }
]

const SCRIPT_STYLES = [
  { id: 'professional', name: 'Professional', description: 'Formal and business-oriented' },
  { id: 'casual', name: 'Casual', description: 'Friendly and conversational' },
  { id: 'energetic', name: 'Energetic', description: 'High-energy and exciting' },
  { id: 'informative', name: 'Informative', description: 'Educational and detailed' },
  { id: 'humorous', name: 'Humorous', description: 'Fun and entertaining' },
  { id: 'emotional', name: 'Emotional', description: 'Touching and heartfelt' }
]

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
  
  // Script Generator State
  const [scriptTopic, setScriptTopic] = useState('')
  const [scriptType, setScriptType] = useState('')
  const [scriptStyle, setScriptStyle] = useState('')
  const [scriptDuration, setScriptDuration] = useState('')
  const [generatedScript, setGeneratedScript] = useState('')
  const [scriptLoading, setScriptLoading] = useState(false)
  
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
  const [activeTab, setActiveTab] = useState('tts')

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

  const generateScript = async () => {
    if (!scriptTopic.trim()) {
      setError('Please enter a topic or idea for your script')
      return
    }

    if (!scriptType) {
      setError('Please select a script type')
      return
    }

    if (!scriptStyle) {
      setError('Please select a script style')
      return
    }

    setScriptLoading(true)
    setError('')
    setSuccess('')

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (isAuthenticated && token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE}/api/generate-script`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic: scriptTopic,
          type: scriptType,
          style: scriptStyle,
          duration: scriptDuration
        })
      })

      const data = await response.json()
      
      if (!data.success) {
        if (response.status === 401) {
          setError('Please sign in to use the script generator')
          setShowAuthModal(true)
        } else {
          throw new Error(data.error || 'Failed to generate script')
        }
        return
      }
      
      setGeneratedScript(data.script)
      setSuccess('Script generated successfully!')
      
    } catch (error: any) {
      console.error('Script generation error:', error)
      setError(`Script generation failed: ${error.message}`)
    } finally {
      setScriptLoading(false)
    }
  }

  const copyScriptToTTS = () => {
    setText(generatedScript)
    setActiveTab('tts')
    setSuccess('Script copied to TTS generator!')
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedScript)
      setSuccess('Script copied to clipboard!')
    } catch (error) {
      setError('Failed to copy script')
    }
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
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          
          {/* User Status Widget */}
          {userStatus?.authenticated && (
            <Card className="mb-6 border-blue-200 bg-blue-50/50">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Welcome, {userStatus.user.name}!</p>
                      <p className="text-xs text-gray-600">
                        {userStatus.planName} Plan • {userStatus.usage.monthlyCharacters} / {userStatus.usage.monthlyCharactersLimit === -1 ? '∞' : userStatus.usage.monthlyCharactersLimit} chars used
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="flex-1 min-w-[100px] sm:min-w-[120px]">
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${getUsagePercentage()}%` }}
                        />
                      </div>
                    </div>
                    <Link href="/pricing">
                      <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                        {getUsagePercentage() > 80 ? 'Upgrade' : 'Manage'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Interface with Tabs */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center pb-4 sm:pb-6">
              <CardTitle className="flex items-center justify-center text-xl sm:text-2xl mb-2 sm:mb-3">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-blue-600" />
                Gemini AI Content Generator
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-600">
                Generate scripts and convert them to natural-sounding speech using Gemini 2.5 Flash Preview
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
                <TabsList className="grid w-full grid-cols-2 h-12">
                  <TabsTrigger value="script" className="flex items-center text-xs sm:text-sm">
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Script Generator</span>
                    <span className="sm:hidden">Script</span>
                  </TabsTrigger>
                  <TabsTrigger value="tts" className="flex items-center text-xs sm:text-sm">
                    <Mic className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">TTS Generator</span>
                    <span className="sm:hidden">Voice</span>
                  </TabsTrigger>
                </TabsList>

                {/* Script Generator Tab */}
                <TabsContent value="script" className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Input Section */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">
                          Topic / Idea / Details
                        </label>
                        <Textarea
                          placeholder="Describe your script idea, topic, or provide details about what you want to create..."
                          value={scriptTopic}
                          onChange={(e) => setScriptTopic(e.target.value)}
                          rows={4}
                          className="resize-none text-sm sm:text-base"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-semibold text-gray-700 mb-2 block">Script Type</label>
                          <Select value={scriptType} onValueChange={setScriptType}>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select script type" />
                            </SelectTrigger>
                            <SelectContent>
                              {SCRIPT_TYPES.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  <div className="flex items-center">
                                    <type.icon className="h-4 w-4 mr-2" />
                                    {type.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-gray-700 mb-2 block">Script Style</label>
                          <Select value={scriptStyle} onValueChange={setScriptStyle}>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                            <SelectContent>
                              {SCRIPT_STYLES.map((style) => (
                                <SelectItem key={style.id} value={style.id}>
                                  {style.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">
                          Target Duration (optional)
                        </label>
                        <Input
                          placeholder="e.g., 30 seconds, 2 minutes, 5 minutes"
                          value={scriptDuration}
                          onChange={(e) => setScriptDuration(e.target.value)}
                          className="h-11"
                        />
                      </div>

                      {/* Quick Prompt Buttons */}
                      <div className="border rounded-lg p-3 sm:p-4 bg-gray-50">
                        <h3 className="font-semibold text-sm sm:text-base mb-3">Quick Script Ideas</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {SCRIPT_TYPES.map((type) => (
                            <Button
                              key={type.id}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setScriptType(type.id)
                                setScriptTopic(`Create a ${type.description.toLowerCase()} about...`)
                              }}
                              className="justify-start h-auto p-3 text-left"
                            >
                              <type.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                              <div>
                                <div className="font-medium text-xs">{type.name}</div>
                                <div className="text-xs text-gray-500 hidden sm:block">{type.description}</div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>

                      <Button 
                        onClick={generateScript} 
                        disabled={scriptLoading || !scriptTopic.trim()}
                        className="w-full h-12"
                        size="lg"
                      >
                        {scriptLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <FileText className="mr-2 h-4 w-4" />
                        Generate Script
                      </Button>
                    </div>

                    {/* Output Section */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">
                          Generated Script
                        </label>
                        <div className="relative">
                          <Textarea
                            placeholder="Your generated script will appear here..."
                            value={generatedScript}
                            onChange={(e) => setGeneratedScript(e.target.value)}
                            rows={12}
                            className="resize-none text-sm sm:text-base"
                          />
                          {generatedScript && (
                            <div className="absolute top-2 right-2 flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={copyToClipboard}
                                className="h-8 w-8 p-0"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {generatedScript && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            onClick={copyScriptToTTS}
                            className="flex-1 h-11"
                            variant="outline"
                          >
                            <Mic className="mr-2 h-4 w-4" />
                            Convert to Speech
                          </Button>
                          <Button
                            onClick={copyToClipboard}
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 sm:w-auto sm:px-3"
                          >
                            <Copy className="h-4 w-4" />
                            <span className="hidden sm:inline ml-2">Copy</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* TTS Generator Tab */}
                <TabsContent value="tts" className="space-y-4 sm:space-y-6">
                  {/* Text Input */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Text to Convert
                      </label>
                      <span className="text-xs sm:text-sm text-gray-500">
                        {text.length}/5000 characters
                      </span>
                    </div>
                    <Textarea
                      placeholder="Enter the text you want to convert to speech..."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={6}
                      maxLength={5000}
                      className="resize-none text-sm sm:text-base leading-relaxed"
                    />
                  </div>

                  {/* Language and Voice Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Language</label>
                      <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                        <SelectTrigger className="h-12">
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
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Voice</label>
                      <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                        <SelectTrigger className="h-12">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6 bg-gray-50 rounded-xl">
                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-sm font-semibold text-gray-700">
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
                    
                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-sm font-semibold text-gray-700">
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
                    
                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-sm font-semibold text-gray-700">
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
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                    <Button 
                      onClick={generateSpeech} 
                      disabled={loading || !text.trim()}
                      size="lg"
                      className="w-full sm:w-auto px-6 sm:px-8 h-12 text-base font-semibold"
                    >
                      {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      <Mic className="mr-2 h-5 w-5" />
                      Generate Speech
                    </Button>
                    
                    {audioUrl && (
                      <>
                        <Button variant="outline" onClick={playAudio} size="lg" className="w-full sm:w-auto px-4 sm:px-6 h-12">
                          {isPlaying ? <Square className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                          {isPlaying ? 'Stop' : 'Play'}
                        </Button>
                        
                        <Button variant="outline" onClick={downloadAudio} size="lg" className="w-full sm:w-auto px-4 sm:px-6 h-12">
                          <Download className="mr-2 h-5 w-5" />
                          Download
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Audio Player */}
                  {audioUrl && (
                    <Card className="border-green-200 bg-green-50/50">
                      <CardContent className="pt-4 sm:pt-6">
                        <div className="flex items-center mb-4">
                          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                          <h3 className="font-semibold text-green-800">Generated Audio</h3>
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
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>

              {/* Status Messages */}
              {error && (
                <Alert variant="destructive" className="border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-sm text-green-800">{success}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Promotional Content Below Main Interface */}
          <div className="mt-12 space-y-8">
            {/* Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="text-center border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="pt-6 sm:pt-8">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Lightning Fast</h3>
                  <p className="text-gray-600 text-sm">Generate high-quality speech in seconds with our optimized AI engine</p>
                </CardContent>
              </Card>
              
              <Card className="text-center border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="pt-6 sm:pt-8">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Premium Voices</h3>
                  <p className="text-gray-600 text-sm">Access to cutting-edge AI voices with natural emotional expression</p>
                </CardContent>
              </Card>
              
              <Card className="text-center border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="pt-6 sm:pt-8">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">1000 Free Characters</h3>
                  <p className="text-gray-600 text-sm">Start with 1000 characters completely free - no credit card required</p>
                </CardContent>
              </Card>
            </div>

            {/* Info Note */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-yellow-800 mb-3 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2" />
                  🚀 Gemini 2.5 Flash Preview
                </h3>
                <div className="text-sm text-yellow-700 space-y-2">
                  <p><strong>AI Script Generation:</strong> Create engaging scripts for any purpose with advanced AI</p>
                  <p><strong>Latest AI Voices:</strong> Experience state-of-the-art voices including Puck, Charon, Kore, Fenrir, and Aoede</p>
                  <p><strong>Pricing Plans:</strong> Free (1,000 chars), Starter (₹199), Pro (₹499), Enterprise (₹1,999)</p>
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
              </CardContent>
            </Card>

            {/* Free Trial CTA for Non-Authenticated Users */}
            {!isAuthenticated && (
              <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <CardContent className="text-center py-8 sm:py-12">
                  <div className="max-w-2xl mx-auto">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                      🎉 AI Script Generator + Premium Voices!
                    </h3>
                    <p className="text-blue-100 mb-6 text-base sm:text-lg">
                      Sign up for unlimited access to AI script generation, premium voices, and download features!
                      Perfect for content creators, marketers, and businesses.
                    </p>
                    <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
                      <Button
                        onClick={() => setShowAuthModal(true)}
                        size="lg"
                        className="bg-white text-blue-600 hover:bg-gray-100 w-full sm:w-auto px-6 sm:px-8 h-12 text-base font-semibold"
                      >
                        Sign Up for Premium Features →
                      </Button>
                      <Link href="/pricing">
                        <Button
                          variant="outline"
                          size="lg"
                          className="border-white text-white hover:bg-white hover:text-blue-600 w-full sm:w-auto px-6 sm:px-8 h-12 text-base font-semibold"
                        >
                          View Pricing
                        </Button>
                      </Link>
                    </div>
                    <p className="text-sm text-blue-200 mt-6">
                      No credit card required • Start in under 30 seconds • Upgrade anytime
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
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