'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, AlertCircle, Loader2, Star, User, CreditCard } from 'lucide-react'
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
  availableVoices: string[]
}

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [paymentLoading, setPaymentLoading] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [activeTab, setActiveTab] = useState('pricing')

  useEffect(() => {
    initializePage()
    loadRazorpayScript()
  }, [])

  useEffect(() => {
    // Update tab based on auth status
    if (isAuthenticated) {
      setActiveTab('dashboard')
      if (token) {
        loadUserDashboard(token)
      }
    } else {
      setActiveTab('pricing')
    }
  }, [isAuthenticated, token])

  const loadRazorpayScript = () => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
  }

  const initializePage = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Load pricing plans
      await loadPricingPlans()
      
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

  const loadUserDashboard = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/user/dashboard`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setDashboardData(data.dashboard)
      } else {
        setError('Failed to load dashboard data')
      }
    } catch (error) {
      console.error('Dashboard error:', error)
      setError('Failed to load dashboard data')
    }
  }

  const handlePlanSelection = async (planId: string) => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      setError('Please sign in to select a plan')
      return
    }
    
    const plan = pricingPlans.find(p => p.id === planId)
    if (!plan) return
    
    if (plan.price === 0) {
      setError('Cannot downgrade to free plan. Contact support if needed.')
      return
    }
    
    setPaymentLoading(planId)
    setError('')
    
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
          name: user?.name || '',
          email: user?.email || ''
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

  const handleAuthRequired = (action: string) => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      setError(`Please sign in to ${action}`)
      return false
    }
    return true
  }

  if (loading && pricingPlans.length === 0) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🎙️ Gemini TTS Pricing
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the perfect plan for your text-to-speech needs. All plans include access to premium AI voices and high-quality audio generation.
            </p>
            {!isAuthenticated && (
              <div className="mt-6">
                <Button 
                  onClick={() => setShowAuthModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Sign Up for Free Trial
                </Button>
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pricing">Pricing Plans</TabsTrigger>
              <TabsTrigger value="dashboard" disabled={!isAuthenticated}>
                {isAuthenticated ? 'My Dashboard' : 'Dashboard (Sign In Required)'}
              </TabsTrigger>
            </TabsList>

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
                          (isAuthenticated && dashboardData?.subscription.plan === plan.id) ||
                          paymentLoading === plan.id
                        }
                        onClick={() => {
                          if (plan.price === 0) {
                            handleAuthRequired('get the free plan')
                          } else {
                            handlePlanSelection(plan.id)
                          }
                        }}
                      >
                        {paymentLoading === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isAuthenticated && dashboardData?.subscription.plan === plan.id 
                          ? 'Current Plan' 
                          : plan.price === 0 
                            ? 'Start Free' 
                            : `Choose ${plan.name}`
                        }
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Features Comparison */}
              <div className="mt-12 bg-white rounded-lg shadow p-6">
                <h3 className="text-2xl font-bold text-center mb-8">Plan Features Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Feature</th>
                        {pricingPlans.map(plan => (
                          <th key={plan.id} className="text-center py-3 px-4">{plan.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Monthly Characters</td>
                        {pricingPlans.map(plan => (
                          <td key={plan.id} className="text-center py-3 px-4">
                            {plan.limits.monthlyCharacters === -1 ? 'Unlimited' : plan.limits.monthlyCharacters.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">API Calls</td>
                        {pricingPlans.map(plan => (
                          <td key={plan.id} className="text-center py-3 px-4">
                            {plan.limits.apiCalls === -1 ? 'Unlimited' : plan.limits.apiCalls.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">Premium Voices</td>
                        {pricingPlans.map(plan => (
                          <td key={plan.id} className="text-center py-3 px-4">
                            {Array.isArray(plan.limits.voices) ? plan.limits.voices.length : plan.limits.voices}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard">
              {isAuthenticated && dashboardData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Account Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        Account Information
                      </CardTitle>
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
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{dashboardData.subscription.planName}</Badge>
                          <span className="text-xs text-gray-500">
                            Status: {dashboardData.subscription.status}
                          </span>
                        </div>
                      </div>
                      {dashboardData.subscription.expiresAt && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Expires</label>
                          <p className="text-sm">
                            {new Date(dashboardData.subscription.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
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
                            {dashboardData.usage.monthlyCharacters.toLocaleString()}/
                            {dashboardData.usage.monthlyCharactersLimit === -1 
                              ? '∞' 
                              : dashboardData.usage.monthlyCharactersLimit.toLocaleString()
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
                            {dashboardData.usage.apiCalls.toLocaleString()}/
                            {dashboardData.usage.apiCallsLimit === -1 
                              ? '∞' 
                              : dashboardData.usage.apiCallsLimit.toLocaleString()
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

                      <div className="pt-2">
                        <p className="text-xs text-gray-500">
                          {dashboardData.usage.charactersRemaining === 'Unlimited' 
                            ? 'Unlimited characters remaining'
                            : `${dashboardData.usage.charactersRemaining} characters remaining this month`
                          }
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Available Voices */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Available Voices</CardTitle>
                      <CardDescription>
                        Voices included in your current plan
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {dashboardData.availableVoices.map((voice, index) => (
                          <div key={index} className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            <span className="text-sm">{voice}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="md:col-span-2 lg:col-span-3">
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-4">
                        <Link href="/tts">
                          <Button>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Go to TTS Generator
                          </Button>
                        </Link>
                        <Button variant="outline" onClick={() => setActiveTab('pricing')}>
                          View All Plans
                        </Button>
                        {getUsagePercentage(dashboardData.usage.monthlyCharacters, dashboardData.usage.monthlyCharactersLimit) > 80 && (
                          <Button variant="outline" className="border-orange-500 text-orange-600">
                            Upgrade Plan (Usage Almost Full)
                          </Button>
                        )}
                      </div>
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
                    <Button onClick={() => setShowAuthModal(true)} className="w-full">
                      Sign In / Sign Up
                    </Button>
                  </CardContent>
                </Card>
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

          {/* FAQ Section */}
          <div className="mt-16 bg-white rounded-lg shadow p-8">
            <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold mb-2">How does billing work?</h4>
                <p className="text-sm text-gray-600">
                  All plans are billed monthly. You can upgrade or downgrade at any time, and changes take effect immediately.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">What happens if I exceed my limits?</h4>
                <p className="text-sm text-gray-600">
                  You'll receive notifications when approaching limits. Generation will be paused until next billing cycle or plan upgrade.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Can I cancel anytime?</h4>
                <p className="text-sm text-gray-600">
                  Yes, you can cancel your subscription at any time. You'll retain access until the end of your billing period.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Do you offer refunds?</h4>
                <p className="text-sm text-gray-600">
                  We offer a 7-day money-back guarantee for all paid plans. Contact support for assistance.
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
