// config/constants.js - All constants and configurations
const PRICING_PLANS = {
  free: {
    id: 'free',
    name: 'Free Plan',
    price: 0,
    currency: 'INR',
    interval: 'month',
    features: [
      '1,000 characters per month',
      'Basic voices (Puck, Kore)',
      'Standard quality audio',
      'Email support'
    ],
    limits: {
      monthlyCharacters: 1000,
      voices: ['Puck', 'Kore'],
      apiCalls: 50
    },
    popular: false
  },
  starter: {
    id: 'starter',
    name: 'Starter Plan',
    price: 199,
    currency: 'INR',
    interval: 'month',
    features: [
      '25,000 characters per month',
      'All voices (Puck, Charon, Kore)',
      'High quality audio',
      'Priority email support',
      'Usage analytics'
    ],
    limits: {
      monthlyCharacters: 25000,
      voices: ['Puck', 'Charon', 'Kore'],
      apiCalls: 1000
    },
    popular: true
  },
  pro: {
    id: 'pro',
    name: 'Pro Plan',
    price: 499,
    currency: 'INR',
    interval: 'month',
    features: [
      '100,000 characters per month',
      'All premium voices (Puck, Charon, Kore, Fenrir, Aoede)',
      'Ultra-high quality audio',
      'Style control features',
      'Priority support',
      'Advanced analytics',
      'API access'
    ],
    limits: {
      monthlyCharacters: 100000,
      voices: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
      apiCalls: 5000
    },
    popular: false
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Plan',
    price: 1999,
    currency: 'INR',
    interval: 'month',
    features: [
      '500,000 characters',
      'All voices + custom voices',
      'Ultra-high quality audio',
      'Advanced style control',
      '24/7 priority support',
      'Custom integrations',
      'White-label solution',
      'Dedicated account manager'
    ],
    limits: {
      monthlyCharacters: 500000, // Unlimited
      voices: 'all',
      apiCalls: 5000 // Unlimited
    },
    popular: false
  }
};

const GEMINI_25_VOICES = {
  'en-US': [
    { name: 'Puck', displayName: 'Puck (Playful, Young)' },
    { name: 'Charon', displayName: 'Charon (Serious, Mature)' },
    { name: 'Kore', displayName: 'Kore (Warm, Friendly)' },
    { name: 'Fenrir', displayName: 'Fenrir (Deep, Authoritative)' },
    { name: 'Aoede', displayName: 'Aoede (Musical, Expressive)' },
    { name: 'Alloy', displayName: 'Alloy (Neutral, Professional)' },
    { name: 'Echo', displayName: 'Echo (Clear, Articulate)' },
    { name: 'Nova', displayName: 'Nova (Modern, Vibrant)' }
  ],
  'en-GB': [
    { name: 'Puck', displayName: 'Puck UK (Playful British)' },
    { name: 'Charon', displayName: 'Charon UK (Serious British)' },
    { name: 'Kore', displayName: 'Kore UK (Warm British)' }
  ],
  'es-US': [
    { name: 'Puck', displayName: 'Puck Spanish (Playful)' },
    { name: 'Charon', displayName: 'Charon Spanish (Serious)' },
    { name: 'Kore', displayName: 'Kore Spanish (Warm)' }
  ],
  'es-ES': [
    { name: 'Puck', displayName: 'Puck España (Playful)' },
    { name: 'Charon', displayName: 'Charon España (Serious)' }
  ],
  'fr-FR': [
    { name: 'Puck', displayName: 'Puck French (Playful)' },
    { name: 'Charon', displayName: 'Charon French (Serious)' },
    { name: 'Kore', displayName: 'Kore French (Warm)' }
  ],
  'de-DE': [
    { name: 'Puck', displayName: 'Puck German (Playful)' },
    { name: 'Charon', displayName: 'Charon German (Serious)' }
  ],
  'it-IT': [
    { name: 'Puck', displayName: 'Puck Italian (Playful)' },
    { name: 'Kore', displayName: 'Kore Italian (Warm)' }
  ],
  'pt-BR': [
    { name: 'Puck', displayName: 'Puck Portuguese (Playful)' },
    { name: 'Charon', displayName: 'Charon Portuguese (Serious)' }
  ],
  'hi-IN': [
    { name: 'Puck', displayName: 'Puck Hindi (Playful)' },
    { name: 'Kore', displayName: 'Kore Hindi (Warm)' }
  ],
  'ja-JP': [
    { name: 'Puck', displayName: 'Puck Japanese (Playful)' },
    { name: 'Charon', displayName: 'Charon Japanese (Serious)' }
  ],
  'ko-KR': [
    { name: 'Puck', displayName: 'Puck Korean (Playful)' },
    { name: 'Kore', displayName: 'Kore Korean (Warm)' }
  ]
};

module.exports = {
  PRICING_PLANS,
  GEMINI_25_VOICES
};
