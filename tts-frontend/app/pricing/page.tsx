'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, AlertCircle, Loader2, Star, User, LogOut, CreditCard } from 'lucide-react'
import Link from 'next/link'

interface PricingPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: string
  features: string[]
  limits: {
    monthlyCharacters: number
    voices: string[] | string
    apiCalls: number
  }
  popular: boolean
}

interface UserDashboard {
  user: {
    id: string
    email: string
    name: string
  }
  subscription: {
    plan: string
    planName: string
    status: string
    expiresAt?: string
  }
  usage: {
    monthlyCharacters: number
    monthlyCharactersLimit: number
    apiCalls: number
    apiCallsLimit: number
    charactersRemaining: string | number
  }
  features: string[]
  availableVoices: string[]
}

declare global {
  interface Window {
    Razorpay: any
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function PricingPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: ''
  })
  
  // Data state
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([])
  const [dashboardData, setDashboardData] = useState<UserDashboard | null>(null)
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [paymentLoading, setPaymentLoading] = useState('')

  useEffect(() => {
    initializePage()
    loadRazorpayScript()
  }, [])

  const loadRazorpayScript = () => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
  }

  const initializePage = async () => {
    try {
      setLoading(true)
      
      // Load pricing plans
      await loadPricingPlans()
      
      // Check if user is logged in
      const token = localStorage.getItem('tts_token')
      if (token) {
        await loadUserDashboard(token)
      }
      
    } catch (error: any) {
      console.error('Initialization error:', error)
      setError('Failed to load page data')
    } finally {
      setLoading(false)
    }
  }

  const loadPricingPlans = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/pricing/plans`)
      const data = await response.json()
      
      if (data.success) {
        setPricingPlans(data.plans)
      } else {
        throw new Error(data.error || 'Failed to load pricing plans')
      }
    } catch (error: any) {
      console.error('Error loading pricing plans:', error)
      setError('Failed to load pricing plans')
    }
  }

  const loadUserDashboard = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/user/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setDashboardData(data.dashboard)
        setIsAuthenticated(true)
      } else {
        localStorage.removeItem('tts_token')
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Dashboard error:', error)
      localStorage.removeItem('tts_token')
      setIsAuthenticated(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = authMode === 'login' 
        ? { email: authForm.email, password: authForm.password }
        : authForm

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()
      
      if (data.success) {
        localStorage.setItem('tts_token', data.token)
        setIsAuthenticated(true)
        await loadUserDashboard(data.token)
        setSuccess(authMode === 'login' ? 'Login successful!' : 'Registration successful!')
        setAuthForm({ email: '', password: '', name: '' })
      } else {
        setError(data.error || 'Authentication failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('tts_token')
    setIsAuthenticated(false)
    setDashboardData(null)
    setSuccess('Logged out successfully')
  }

  const handlePlanSelection = async (planId: string) => {
    if (!isAuthenticated) {
      setError('Please login to select a plan')
      return
    }
    
    const plan = pricingPlans.find(p => p.id === planId)
    if (!plan) return
    
    if (plan.price === 0) {
      setError('Cannot downgrade to free plan. Contact support if needed.')
      return
    }
    
    setPaymentLoading(planId)
    
    try {
      const token = localStorage.getItem('tts_token')
      
      // Create Razorpay order
      const orderResponse = await fetch(`${API_BASE}/api/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      })
      
      const orderData = await orderResponse.json()
      
      if (!orderData.success) {
        throw new Error(orderData.error)
      }
      
      // Initialize Razorpay checkout
      const options = {
        key: orderData.key,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Gemini TTS',
        description: `Subscription to ${plan.name}`,
        order_id: orderData.order.id,
        handler: async function(response: any) {
          await verifyPayment(response, planId)
        },
        prefill: {
          name: dashboardData?.user?.name || '',
          email: dashboardData?.user?.email || ''
        },
        theme: {
          color: '#667eea'
        },
        modal: {
          ondismiss: function() {
            setPaymentLoading('')
            setError('Payment cancelled')
          }
        }
      }
      
      const razorpay = new window.Razorpay(options)
      razorpay.open()
      
    } catch (error: any) {
      console.error('Payment error:', error)
      setError(error.message || 'Payment failed')
      setPaymentLoading('')
    }
  }

  const verifyPayment = async (response: any, planId: string) => {
    try {
      setSuccess('Verifying payment...')
      
      const token = localStorage.getItem('tts_token')
      const verifyResponse = await fetch(`${API_BASE}/api/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          planId: planId
        })
      })
      
      const verifyData = await verifyResponse.json()
      
      if (verifyData.success) {
        setSuccess('Payment successful! Subscription activated.')
        
        // Reload dashboard
        setTimeout(async () => {
          const token = localStorage.getItem('tts_token')
          if (token) {
            await loadUserDashboard(token)
          }
        }, 2000)
      } else {
        throw new Error(verifyData.error)
      }
    } catch (error: any) {
      console.error('Verification error:', error)
      setError(error.message || 'Payment verification failed')
    } finally {
      setPaymentLoading('')
    }
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0
    return Math.min(100, (used / limit) * 100)
  }

  if (loading && pricingPlans.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/tts" className="flex items-center">
              <CreditCard className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Gemini TTS Pricing</h1>
            </Link>
            <div className="flex items-center space-x-4">
              {isAuthenticated && dashboardData ? (
                <>
                  <Badge variant="outline">
                    {dashboardData.subscription.planName}
                  </Badge>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{dashboardData.user.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Link href="/tts">
                  <Button variant="outline" size="sm">
                    Try TTS
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎙️ Gemini TTS Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the perfect plan for your text-to-speech needs. All plans include access to premium AI voices and high-quality audio generation.
          </p>
        </div>

        <Tabs defaultValue={isAuthenticated ? "dashboard" : "auth"} className="space-y-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="pricing">Pricing Plans</TabsTrigger>
            <TabsTrigger value="dashboard" disabled={!isAuthenticated}>Dashboard</TabsTrigger>
          </TabsList>

          {/* Authentication Tab */}
          <TabsContent value="auth">
            {!isAuthenticated ? (
              <Card className="max-w-md mx-auto">
                <CardHeader>
                  <div className="flex justify-center space-x-1 mb-4">
                    <Button
                      variant={authMode === 'login' ? 'default' : 'outline'}
                      onClick={() => setAuthMode('login')}
                    >
                      Login
                    </Button>
                    <Button
                      variant={authMode === 'register' ? 'default' : 'outline'}
                      onClick={() => setAuthMode('register')}
                    >
                      Register
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAuth} className="space-y-4">
                    {authMode === 'register' && (
                      <div>
                        <Input
                          type="text"
                          placeholder="Full Name"
                          value={authForm.name}
                          onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                          required
                        />
                      </div>
                    )}
                    <div>
                      <Input
                        type="email"
                        placeholder="Email"
                        value={authForm.email}
                        onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        type="password"
                        placeholder="Password"
                        value={authForm.password}
                        onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                        required
                      />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {authMode === 'login' ? 'Sign In' : 'Sign Up'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="max-w-md mx-auto">
                <CardContent className="pt-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Welcome back!</h3>
                  <p className="text-gray-600 mb-4">You are logged in as {dashboardData?.user.name}</p>
                  <div className="space-y-2">
                    <Link href="/tts">
                      <Button className="w-full">Go to TTS Generator</Button>
                    </Link>
                    <Button variant="outline" onClick={handleLogout} className="w-full">
                      Logout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Pricing Plans Tab */}
          <TabsContent value="pricing">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {pricingPlans.map((plan) => (
                <Card key={plan.id} className={`relative ${plan.popular ? 'border-blue-500 border-2' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-500">
                        <Star className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold text-blue-600">
                      ₹{plan.price}
                      <span className="text-sm font-normal text-gray-500">/{plan.interval}</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className="w-full"
                      variant={plan.price === 0 ? 'outline' : 'default'}
                      disabled={
                        !isAuthenticated || 
                        (dashboardData?.subscription.plan === plan.id) ||
                        paymentLoading === plan.id
                      }
                      onClick={() => handlePlanSelection(plan.id)}
                    >
                      {paymentLoading === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {dashboardData?.subscription.plan === plan.id 
                        ? 'Current Plan' 
                        : plan.price === 0 
                          ? 'Free Plan' 
                          : `Choose ${plan.name}`
                      }
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            {dashboardData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Account Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p className="text-sm">{dashboardData.user.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-sm">{dashboardData.user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Plan</label>
                      <p className="text-sm font-medium">{dashboardData.subscription.planName}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Usage Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Characters Used</span>
                        <span>
                          {dashboardData.usage.monthlyCharacters}/
                          {dashboardData.usage.monthlyCharactersLimit === -1 
                            ? '∞' 
                            : dashboardData.usage.monthlyCharactersLimit
                          }
                        </span>
                      </div>
                      <Progress 
                        value={getUsagePercentage(
                          dashboardData.usage.monthlyCharacters,
                          dashboardData.usage.monthlyCharactersLimit
                        )} 
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>API Calls</span>
                        <span>
                          {dashboardData.usage.apiCalls}/
                          {dashboardData.usage.apiCallsLimit === -1 
                            ? '∞' 
                            : dashboardData.usage.apiCallsLimit
                          }
                        </span>
                      </div>
                      <Progress 
                        value={getUsagePercentage(
                          dashboardData.usage.apiCalls,
                          dashboardData.usage.apiCallsLimit
                        )} 
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Available Voices */}
                <Card>
                  <CardHeader>
                    <CardTitle>Available Voices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {dashboardData.availableVoices.map((voice, index) => (
                        <div key={index} className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-sm">{voice}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Status Messages */}
        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mt-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
