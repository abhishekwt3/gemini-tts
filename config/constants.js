// config/constants.js - Updated with both Gemini and Google TTS Chirp3 HD voices
const PRICING_PLANS = {
  free: {
    id: 'free',
    name: 'Free Plan',
    price: 0,
    currency: 'INR',
    interval: 'month',
    features: [
      '1,000 characters per month',
      'Basic voices (Puck, Kore, Alnilam)',
      'Standard quality audio',
      'Email support'
    ],
    limits: {
      monthlyCharacters: 1000,
      voices: ['Puck', 'Kore', 'Chirp3-HD-Alnilam'],
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
      'Premium voices (Gemini + 5 Chirp3 HD)',
      'High quality audio',
      'Priority email support',
      'Usage analytics'
    ],
    limits: {
      monthlyCharacters: 25000,
      voices: ['Puck', 'Charon', 'Kore', 'Chirp3-HD-Alnilam', 'Chirp3-HD-Achernar', 'Chirp3-HD-Algenib', 'Chirp3-HD-Aldebaran', 'Chirp3-HD-Altair'],
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
      'All voices (Gemini + All Chirp3 HD)',
      'Ultra-high quality audio',
      'SSML support',
      'Priority support',
      'Advanced analytics',
      'API access'
    ],
    limits: {
      monthlyCharacters: 100000,
      voices: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Alloy', 'Echo', 'Nova', 'Chirp3-HD-Alnilam', 'Chirp3-HD-Achernar', 'Chirp3-HD-Algenib', 'Chirp3-HD-Aldebaran', 'Chirp3-HD-Altair', 'Chirp3-HD-Antares', 'Chirp3-HD-Arcturus', 'Chirp3-HD-Bellatrix'],
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
      'All voices + custom models',
      'Ultra-high quality audio',
      'Advanced SSML control',
      '24/7 priority support',
      'Custom integrations',
      'White-label solution',
      'Dedicated account manager'
    ],
    limits: {
      monthlyCharacters: 500000,
      voices: 'all',
      apiCalls: 25000
    },
    popular: false
  }
};

// Combined Gemini and Google TTS Chirp3 HD voices
const GEMINI_25_VOICES = {
  'en-US': [
    // Gemini voices
    { name: 'Puck', displayName: 'Puck (Playful, Young)' },
    { name: 'Charon', displayName: 'Charon (Serious, Mature)' },
    { name: 'Kore', displayName: 'Kore (Warm, Friendly)' },
    { name: 'Fenrir', displayName: 'Fenrir (Deep, Authoritative)' },
    { name: 'Aoede', displayName: 'Aoede (Musical, Expressive)' },
    { name: 'Alloy', displayName: 'Alloy (Neutral, Professional)' },
    { name: 'Echo', displayName: 'Echo (Clear, Articulate)' },
    { name: 'Nova', displayName: 'Nova (Modern, Vibrant)' },
    // Google TTS Chirp3 HD voices
    { name: 'Chirp3-HD-Alnilam', displayName: 'Alnilam HD (Natural, Balanced)' },
    { name: 'Chirp3-HD-Achernar', displayName: 'Achernar HD (Warm, Expressive)' },
    { name: 'Chirp3-HD-Algenib', displayName: 'Algenib HD (Clear, Professional)' },
    { name: 'Chirp3-HD-Aldebaran', displayName: 'Aldebaran HD (Deep, Authoritative)' },
    { name: 'Chirp3-HD-Altair', displayName: 'Altair HD (Bright, Energetic)' },
    { name: 'Chirp3-HD-Antares', displayName: 'Antares HD (Sophisticated, Mature)' },
    { name: 'Chirp3-HD-Arcturus', displayName: 'Arcturus HD (Smooth, Confident)' },
    { name: 'Chirp3-HD-Bellatrix', displayName: 'Bellatrix HD (Dynamic, Bold)' }
  ],
  'en-GB': [
    // Gemini voices
    { name: 'Puck', displayName: 'Puck UK (Playful British)' },
    { name: 'Charon', displayName: 'Charon UK (Serious British)' },
    { name: 'Kore', displayName: 'Kore UK (Warm British)' },
    // Google TTS Chirp3 HD voices
    { name: 'Chirp3-HD-Alnilam', displayName: 'Alnilam HD UK (Natural British)' },
    { name: 'Chirp3-HD-Achernar', displayName: 'Achernar HD UK (Warm British)' },
    { name: 'Chirp3-HD-Algenib', displayName: 'Algenib HD UK (Professional British)' },
    { name: 'Chirp3-HD-Aldebaran', displayName: 'Aldebaran HD UK (Authoritative British)' },
    { name: 'Chirp3-HD-Altair', displayName: 'Altair HD UK (Energetic British)' },
    { name: 'Chirp3-HD-Antares', displayName: 'Antares HD UK (Sophisticated British)' },
    { name: 'Chirp3-HD-Arcturus', displayName: 'Arcturus HD UK (Confident British)' },
    { name: 'Chirp3-HD-Bellatrix', displayName: 'Bellatrix HD UK (Bold British)' }
  ],
  'es-US': [
    // Gemini voices
    { name: 'Puck', displayName: 'Puck Spanish (Playful)' },
    { name: 'Charon', displayName: 'Charon Spanish (Serious)' },
    { name: 'Kore', displayName: 'Kore Spanish (Warm)' },
    // Google TTS Chirp3 HD voices
    { name: 'Chirp3-HD-Alnilam', displayName: 'Alnilam HD Spanish (Natural)' },
    { name: 'Chirp3-HD-Achernar', displayName: 'Achernar HD Spanish (Warm)' },
    { name: 'Chirp3-HD-Algenib', displayName: 'Algenib HD Spanish (Professional)' },
    { name: 'Chirp3-HD-Aldebaran', displayName: 'Aldebaran HD Spanish (Authoritative)' },
    { name: 'Chirp3-HD-Altair', displayName: 'Altair HD Spanish (Energetic)' },
    { name: 'Chirp3-HD-Antares', displayName: 'Antares HD Spanish (Sophisticated)' },
    { name: 'Chirp3-HD-Arcturus', displayName: 'Arcturus HD Spanish (Confident)' },
    { name: 'Chirp3-HD-Bellatrix', displayName: 'Bellatrix HD Spanish (Bold)' }
  ],
  'es-ES': [
    // Gemini voices
    { name: 'Puck', displayName: 'Puck España (Playful)' },
    { name: 'Charon', displayName: 'Charon España (Serious)' },
    // Google TTS Chirp3 HD voices
    { name: 'Chirp3-HD-Alnilam', displayName: 'Alnilam HD España (Natural)' },
    { name: 'Chirp3-HD-Achernar', displayName: 'Achernar HD España (Warm)' },
    { name: 'Chirp3-HD-Algenib', displayName: 'Algenib HD España (Professional)' },
    { name: 'Chirp3-HD-Aldebaran', displayName: 'Aldebaran HD España (Authoritative)' },
    { name: 'Chirp3-HD-Altair', displayName: 'Altair HD España (Energetic)' },
    { name: 'Chirp3-HD-Antares', displayName: 'Antares HD España (Sophisticated)' },
    { name: 'Chirp3-HD-Arcturus', displayName: 'Arcturus HD España (Confident)' },
    { name: 'Chirp3-HD-Bellatrix', displayName: 'Bellatrix HD España (Bold)' }
  ],
  'fr-FR': [
    // Gemini voices
    { name: 'Puck', displayName: 'Puck French (Playful)' },
    { name: 'Charon', displayName: 'Charon French (Serious)' },
    { name: 'Kore', displayName: 'Kore French (Warm)' },
    // Google TTS Chirp3 HD voices
    { name: 'Chirp3-HD-Alnilam', displayName: 'Alnilam HD French (Natural)' },
    { name: 'Chirp3-HD-Achernar', displayName: 'Achernar HD French (Warm)' },
    { name: 'Chirp3-HD-Algenib', displayName: 'Algenib HD French (Professional)' },
    { name: 'Chirp3-HD-Aldebaran', displayName: 'Aldebaran HD French (Authoritative)' },
    { name: 'Chirp3-HD-Altair', displayName: 'Altair HD French (Energetic)' },
    { name: 'Chirp3-HD-Antares', displayName: 'Antares HD French (Sophisticated)' },
    { name: 'Chirp3-HD-Arcturus', displayName: 'Arcturus HD French (Confident)' },
    { name: 'Chirp3-HD-Bellatrix', displayName: 'Bellatrix HD French (Bold)' }
  ],
  'de-DE': [
    // Gemini voices
    { name: 'Puck', displayName: 'Puck German (Playful)' },
    { name: 'Charon', displayName: 'Charon German (Serious)' },
    // Google TTS Chirp3 HD voices
    { name: 'Chirp3-HD-Alnilam', displayName: 'Alnilam HD German (Natural)' },
    { name: 'Chirp3-HD-Achernar', displayName: 'Achernar HD German (Warm)' },
    { name: 'Chirp3-HD-Algenib', displayName: 'Algenib HD German (Professional)' },
    { name: 'Chirp3-HD-Aldebaran', displayName: 'Aldebaran HD German (Authoritative)' },
    { name: 'Chirp3-HD-Altair', displayName: 'Altair HD German (Energetic)' },
    { name: 'Chirp3-HD-Antares', displayName: 'Antares HD German (Sophisticated)' },
    { name: 'Chirp3-HD-Arcturus', displayName: 'Arcturus HD German (Confident)' },
    { name: 'Chirp3-HD-Bellatrix', displayName: 'Bellatrix HD German (Bold)' }
  ],
  'it-IT': [
    // Gemini voices
    { name: 'Puck', displayName: 'Puck Italian (Playful)' },
    { name: 'Kore', displayName: 'Kore Italian (Warm)' },
    // Google TTS Chirp3 HD voices
    { name: 'Chirp3-HD-Alnilam', displayName: 'Alnilam HD Italian (Natural)' },
    { name: 'Chirp3-HD-Achernar', displayName: 'Achernar HD Italian (Warm)' },
    { name: 'Chirp3-HD-Algenib', displayName: 'Algenib HD Italian (Professional)' },
    { name: 'Chirp3-HD-Aldebaran', displayName: 'Aldebaran HD Italian (Authoritative)' },
    { name: 'Chirp3-HD-Altair', displayName: 'Altair HD Italian (Energetic)' },
    { name: 'Chirp3-HD-Antares', displayName: 'Antares HD Italian (Sophisticated)' },
    { name: 'Chirp3-HD-Arcturus', displayName: 'Arcturus HD Italian (Confident)' },
    { name: 'Chirp3-HD-Bellatrix', displayName: 'Bellatrix HD Italian (Bold)' }
  ],
  'pt-BR': [
    // Gemini voices
    { name: 'Puck', displayName: 'Puck Portuguese (Playful)' },
    { name: 'Charon', displayName: 'Charon Portuguese (Serious)' },
    // Google TTS Chirp3 HD voices
    { name: 'Chirp3-HD-Alnilam', displayName: 'Alnilam HD Portuguese (Natural)' },
    { name: 'Chirp3-HD-Achernar', displayName: 'Achernar HD Portuguese (Warm)' },
    { name: 'Chirp3-HD-Algenib', displayName: 'Algenib HD Portuguese (Professional)' },
    { name: 'Chirp3-HD-Aldebaran', displayName: 'Aldebaran HD Portuguese (Authoritative)' },
    { name: 'Chirp3-HD-Altair', displayName: 'Altair HD Portuguese (Energetic)' },
    { name: 'Chirp3-HD-Antares', displayName: 'Antares HD Portuguese (Sophisticated)' },
    { name: 'Chirp3-HD-Arcturus', displayName: 'Arcturus HD Portuguese (Confident)' },
    { name: 'Chirp3-HD-Bellatrix', displayName: 'Bellatrix HD Portuguese (Bold)' }
  ],
  'hi-IN': [
    // Gemini voices
    { name: 'Puck', displayName: 'Puck Hindi (Playful)' },
    { name: 'Kore', displayName: 'Kore Hindi (Warm)' },
    // Google TTS Chirp3 HD voices
    { name: 'Chirp3-HD-Alnilam', displayName: 'Alnilam HD Hindi (Natural)' },
    { name: 'Chirp3-HD-Achernar', displayName: 'Achernar HD Hindi (Warm)' },
    { name: 'Chirp3-HD-Algenib', displayName: 'Algenib HD Hindi (Professional)' },
    { name: 'Chirp3-HD-Aldebaran', displayName: 'Aldebaran HD Hindi (Authoritative)' },
    { name: 'Chirp3-HD-Altair', displayName: 'Altair HD Hindi (Energetic)' },
    { name: 'Chirp3-HD-Antares', displayName: 'Antares HD Hindi (Sophisticated)' },
    { name: 'Chirp3-HD-Arcturus', displayName: 'Arcturus HD Hindi (Confident)' },
    { name: 'Chirp3-HD-Bellatrix', displayName: 'Bellatrix HD Hindi (Bold)' }
  ],
  'ja-JP': [
    // Gemini voices
    { name: 'Puck', displayName: 'Puck Japanese (Playful)' },
    { name: 'Charon', displayName: 'Charon Japanese (Serious)' },
    // Google TTS Chirp3 HD voices
    { name: 'Chirp3-HD-Alnilam', displayName: 'Alnilam HD Japanese (Natural)' },
    { name: 'Chirp3-HD-Achernar', displayName: 'Achernar HD Japanese (Warm)' },
    { name: 'Chirp3-HD-Algenib', displayName: 'Algenib HD Japanese (Professional)' },
    { name: 'Chirp3-HD-Aldebaran', displayName: 'Aldebaran HD Japanese (Authoritative)' },
    { name: 'Chirp3-HD-Altair', displayName: 'Altair HD Japanese (Energetic)' },
    { name: 'Chirp3-HD-Antares', displayName: 'Antares HD Japanese (Sophisticated)' },
    { name: 'Chirp3-HD-Arcturus', displayName: 'Arcturus HD Japanese (Confident)' },
    { name: 'Chirp3-HD-Bellatrix', displayName: 'Bellatrix HD Japanese (Bold)' }
  ],
  'ko-KR': [
    // Gemini voices
    { name: 'Puck', displayName: 'Puck Korean (Playful)' },
    { name: 'Kore', displayName: 'Kore Korean (Warm)' },
    // Google TTS Chirp3 HD voices
    { name: 'Chirp3-HD-Alnilam', displayName: 'Alnilam HD Korean (Natural)' },
    { name: 'Chirp3-HD-Achernar', displayName: 'Achernar HD Korean (Warm)' },
    { name: 'Chirp3-HD-Algenib', displayName: 'Algenib HD Korean (Professional)' },
    { name: 'Chirp3-HD-Aldebaran', displayName: 'Aldebaran HD Korean (Authoritative)' },
    { name: 'Chirp3-HD-Altair', displayName: 'Altair HD Korean (Energetic)' },
    { name: 'Chirp3-HD-Antares', displayName: 'Antares HD Korean (Sophisticated)' },
    { name: 'Chirp3-HD-Arcturus', displayName: 'Arcturus HD Korean (Confident)' },
    { name: 'Chirp3-HD-Bellatrix', displayName: 'Bellatrix HD Korean (Bold)' }
  ]
};

module.exports = {
  PRICING_PLANS,
  GEMINI_25_VOICES
};