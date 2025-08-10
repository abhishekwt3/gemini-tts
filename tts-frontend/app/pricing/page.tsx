'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, AlertCircle, Loader2, Star, User, CreditCard, Crown, Zap } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import Navigation from '../components/Navigation'
import AuthModal from '../components/AuthModal'

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
  availableVoices: string[] | string
}

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: any
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function PricingPage() {
  const { user, token, isAuthenticated } = useAuth()
  
  // Data state
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([])
  const [dashboardData, setDashboardData] = useState<UserDashboard | null>(null)
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [paymentLoading, setPaymentLoading] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [activeTab, setActiveTab] = useState('pricing')

  useEffect(() => {
    initializePage()
  }, [])

  useEffect(() => {
    if (isAuthenticated && token) {
      setActiveTab('dashboard')
      loadUserDashboard()
    } else {
      setActiveTab('pricing')
    }
  }, [isAuthenticated, token])

  useEffect(() => {
    // Load Razorpay script
    if (!window.Razorpay) {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => console.log('Razorpay loaded')
      document.body.appendChild(script)
    }
  }, [])

  const initializePage = async () => {
    try {
      setLoading(true)
      setError('')
      
      await loadPricingPlans()
      
    } catch (error: any) {
      console.error('Initialization error:', error)
      setError('Failed to load pricing plans')
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
      throw error
    }
  }

  const loadUserDashboard = async () => {
    if (!token) return

    try {
      const response = await fetch(`${API_BASE}/api/user/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success && data.dashboard) {
        // Validate dashboard data before setting
        const dashboard = data.dashboard
        if (dashboard.user && dashboard.subscription && dashboard.usage) {
          setDashboardData(dashboard)
        } else {
          console.error('Invalid dashboard data structure:', dashboard)
          setError('Invalid dashboard data received')
        }
      } else {
        console.error('Failed to load dashboard:', data.error)
        setError('Failed to load dashboard data')
      }
    } catch (error) {
      console.error('Dashboard error:', error)
      setError('Error loading dashboard')
    }
  }

  const handlePlanSelection = async (planId: string) => {
    // Clear previous messages
    setError('')
    setSuccess('')

    if (!isAuthenticated) {
      setShowAuthModal(true)
      setError('Please sign in to select a plan')
      return
    }
    
    const plan = pricingPlans.find(p => p.id === planId)
    if (!plan) {
      setError('Plan not found')
      return
    }
    
    if (plan.price === 0) {
      setError('Free plan is automatically assigned. Contact support to downgrade from paid plans.')
      return
    }

    // Check if user already has this plan
    if (dashboardData?.subscription?.plan === planId) {
      setError('You already have this plan')
      return
    }
    
    setPaymentLoading(planId)
    
    try {
      // Create Razorpay order
      const orderResponse = await fetch(`${API_BASE}/api/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      })
      
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        throw new Error(errorData.error || `HTTP ${orderResponse.status}`)
      }

      const orderData = await orderResponse.json()
      
      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to create payment order')
      }

      // Check if Razorpay is loaded
      if (!window.Razorpay) {
        throw new Error('Payment system not loaded. Please refresh and try again.')
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
          setSuccess('Payment successful! Verifying...')
          await verifyPayment(response, planId)
        },
        prefill: {
          name: (user?.name || 'User').replace(/[^a-zA-Z\s]/g, '').trim() || 'User',
          email: user?.email || ''
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: function() {
            setPaymentLoading('')
            setError('Payment cancelled by user')
          }
        }
      }
      
      const razorpay = new window.Razorpay(options)
      razorpay.open()
      
    } catch (error: any) {
      console.error('Payment error:', error)
      setError(error.message || 'Payment initialization failed')
      setPaymentLoading('')
    }
  }

  const verifyPayment = async (response: any, planId: string) => {
    try {
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
        setSuccess('🎉 Payment successful! Your subscription has been activated.')
        setPaymentLoading('')
        
        // Reload dashboard data after a short delay to ensure DB is updated
        setTimeout(async () => {
          await loadUserDashboard()
          setActiveTab('dashboard')
        }, 3000) // Increased delay to ensure database update is complete
      } else {
        throw new Error(verifyData.error || 'Payment verification failed')
      }
    } catch (error: any) {
      console.error('Verification error:', error)
      setError(error.message || 'Payment verification failed')
      setPaymentLoading('')
    }
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0
    return Math.min(100, (used / limit) * 100)
  }

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter': return <Zap className="h-5 w-5" />
      case 'pro': return <Crown className="h-5 w-5" />
      case 'enterprise': return <Star className="h-5 w-5" />
      default: return <User className="h-5 w-5" />
    }
  }

  const isCurrentPlan = (planId: string) => {
    return dashboardData?.subscription?.plan === planId
  }

  // Safe access helpers
  const getDashboardValue = (path: string, fallback: any = 'N/A') => {
    const keys = path.split('.')
    let value = dashboardData
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as any)[key]
      } else {
        return fallback
      }
    }
    return value ?? fallback
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading pricing plans...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              🎙️ Gemini TTS Pricing
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
              Choose the perfect plan for your text-to-speech needs. All plans include access to premium AI voices and high-quality audio generation.
            </p>
            {!isAuthenticated && (
              <Button 
                onClick={() => setShowAuthModal(true)}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Get Started Free
              </Button>
            )}
          </div>

          {/* Status Messages */}
          {error && (
            <Alert variant="destructive" className="mb-6 max-w-2xl mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-6 max-w-2xl mx-auto">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="flex justify-center">
              <TabsList className="grid grid-cols-2 w-96">
                <TabsTrigger value="pricing">Pricing Plans</TabsTrigger>
                <TabsTrigger value="dashboard" disabled={!isAuthenticated}>
                  {isAuthenticated ? 'My Dashboard' : 'Dashboard'}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Pricing Plans Tab */}
            <TabsContent value="pricing" className="space-y-8">
              
              {/* Pricing Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {pricingPlans.map((plan) => (
                  <Card 
                    key={plan.id} 
                    className={`relative hover:shadow-lg transition-all duration-300 ${
                      plan.popular 
                        ? 'border-blue-500 border-2 scale-105' 
                        : isCurrentPlan(plan.id)
                          ? 'border-green-500 border-2'
                          : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                        <Badge className="bg-blue-500 px-3 py-1">
                          <Star className="h-3 w-3 mr-1" />
                          Most Popular
                        </Badge>
                      </div>
                    )}

                    {isCurrentPlan(plan.id) && (
                      <div className="absolute -top-4 right-4 z-10">
                        <Badge className="bg-green-500">
                          Current Plan
                        </Badge>
                      </div>
                    )}
                    
                    <CardHeader className="text-center pb-2">
                      <div className="flex justify-center mb-2">
                        {getPlanIcon(plan.id)}
                      </div>
                      <CardTitle className="text-xl mb-2">{plan.name}</CardTitle>
                      <div className="mb-2">
                        <span className="text-3xl font-bold text-blue-600">₹{plan.price}</span>
                        {plan.price > 0 && (
                          <span className="text-gray-500 text-sm">/{plan.interval}</span>
                        )}
                      </div>
                      <CardDescription className="text-sm">
                        {plan.limits.monthlyCharacters === -1 
                          ? 'Unlimited characters' 
                          : `${plan.limits.monthlyCharacters.toLocaleString()} characters/month`
                        }
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pt-2">
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <Button 
                        className="w-full"
                        variant={plan.price === 0 ? 'outline' : 'default'}
                        disabled={
                          isCurrentPlan(plan.id) ||
                          paymentLoading === plan.id
                        }
                        onClick={() => handlePlanSelection(plan.id)}
                      >
                        {paymentLoading === plan.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : isCurrentPlan(plan.id) ? (
                          'Current Plan'
                        ) : plan.price === 0 ? (
                          'Get Started Free'
                        ) : (
                          `Upgrade to ${plan.name}`
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Feature Comparison Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Feature Comparison</CardTitle>
                  <CardDescription className="text-center">
                    Compare what's included in each plan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Feature</th>
                          {pricingPlans.map(plan => (
                            <th key={plan.id} className="text-center py-3 px-2 font-medium">
                              <div className="flex flex-col items-center">
                                <span>{plan.name}</span>
                                {isCurrentPlan(plan.id) && (
                                  <Badge variant="outline" className="mt-1 text-xs">Current</Badge>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="py-3 px-4 font-medium">Characters/Month</td>
                          {pricingPlans.map(plan => (
                            <td key={plan.id} className="text-center py-3 px-2">
                              {plan.limits.monthlyCharacters === -1 ? 'Unlimited' : plan.limits.monthlyCharacters.toLocaleString()}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-medium">API Calls/Month</td>
                          {pricingPlans.map(plan => (
                            <td key={plan.id} className="text-center py-3 px-2">
                              {plan.limits.apiCalls === -1 ? 'Unlimited' : plan.limits.apiCalls.toLocaleString()}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-medium">Voice Access</td>
                          {pricingPlans.map(plan => (
                            <td key={plan.id} className="text-center py-3 px-2">
                              {Array.isArray(plan.limits.voices) 
                                ? `${plan.limits.voices.length} voices`
                                : plan.limits.voices
                              }
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard">
              {isAuthenticated && dashboardData ? (
                <div className="space-y-6">
                  {/* Account Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-lg">
                          <User className="h-5 w-5 mr-2" />
                          Account
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Name</label>
                          <p className="text-sm font-medium">{getDashboardValue('user.name', 'User')}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <p className="text-sm">{getDashboardValue('user.email', 'N/A')}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Current Plan</label>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="capitalize">
                              {getDashboardValue('subscription.planName', 'Free')}
                            </Badge>
                            <span className="text-xs text-green-600">
                              {getDashboardValue('subscription.status', 'active')}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-lg">
                          <CreditCard className="h-5 w-5 mr-2" />
                          Usage Stats
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Characters Used</span>
                            <span>
                              {getDashboardValue('usage.monthlyCharacters', 0).toLocaleString()}/
                              {getDashboardValue('usage.monthlyCharactersLimit', 0) === -1 
                                ? '∞' 
                                : getDashboardValue('usage.monthlyCharactersLimit', 0).toLocaleString()
                              }
                            </span>
                          </div>
                          <Progress 
                            value={getUsagePercentage(
                              getDashboardValue('usage.monthlyCharacters', 0),
                              getDashboardValue('usage.monthlyCharactersLimit', 0)
                            )} 
                            className="h-2"
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>API Calls</span>
                            <span>
                              {getDashboardValue('usage.apiCalls', 0).toLocaleString()}/
                              {getDashboardValue('usage.apiCallsLimit', 0) === -1 
                                ? '∞' 
                                : getDashboardValue('usage.apiCallsLimit', 0).toLocaleString()
                              }
                            </span>
                          </div>
                          <Progress 
                            value={getUsagePercentage(
                              getDashboardValue('usage.apiCalls', 0),
                              getDashboardValue('usage.apiCallsLimit', 0)
                            )} 
                            className="h-2"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-lg">
                          <Zap className="h-5 w-5 mr-2" />
                          Quick Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Link href="/tts">
                          <Button className="w-full">
                            Go to TTS Generator
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setActiveTab('pricing')}
                        >
                          View All Plans
                        </Button>
                        {getUsagePercentage(
                          getDashboardValue('usage.monthlyCharacters', 0), 
                          getDashboardValue('usage.monthlyCharactersLimit', 0)
                        ) > 80 && (
                          <Button 
                            variant="outline" 
                            className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                            onClick={() => setActiveTab('pricing')}
                          >
                            ⚠️ Upgrade Plan
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Available Voices */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Available Voices</CardTitle>
                      <CardDescription>
                        Voices included in your {getDashboardValue('subscription.planName', 'Free')} plan
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {getDashboardValue('availableVoices') === 'all' ? (
                        <div className="text-center p-8">
                          <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">All Premium Voices</h3>
                          <p className="text-gray-600">
                            Your Enterprise plan includes access to all premium voices including custom voices and future releases.
                          </p>
                        </div>
                      ) : Array.isArray(getDashboardValue('availableVoices')) ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {(getDashboardValue('availableVoices', []) as string[]).map((voice, index) => (
                            <div key={index} className="flex items-center p-2 bg-gray-50 rounded-md">
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                              <span className="text-sm font-medium">{voice}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-4">
                          <p className="text-gray-500">Loading voice information...</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="max-w-md mx-auto">
                  <CardContent className="pt-6 text-center">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Sign In Required</h3>
                    <p className="text-gray-600 mb-4">
                      Please sign in to view your dashboard and manage your subscription.
                    </p>
                    <Button 
                      onClick={() => setShowAuthModal(true)} 
                      className="w-full"
                    >
                      Sign In / Sign Up
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* FAQ Section */}
          <div className="mt-16 bg-white rounded-lg shadow-sm p-8">
            <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              <div>
                <h4 className="font-semibold mb-2">How does billing work?</h4>
                <p className="text-gray-600">
                  Plans are billed monthly. Upgrades take effect immediately with prorated billing.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">What if I exceed limits?</h4>
                <p className="text-gray-600">
                  You'll get notifications when approaching limits. Service pauses until upgrade or next cycle.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Can I cancel anytime?</h4>
                <p className="text-gray-600">
                  Yes, cancel anytime. You keep access until the end of your billing period.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Refund policy?</h4>
                <p className="text-gray-600">
                  7-day money-back guarantee on all paid plans. Contact support for refunds.
                </p>
              </div>
            </div>
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