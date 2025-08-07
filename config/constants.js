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
      'Basic voices (Puck, Kore, Journey)',
      'Standard quality audio',
      'Basic script generation',
      'Email support'
    ],
    limits: {
      monthlyCharacters: 1000,
      voices: ['Puck', 'Kore', 'en-US-Journey-F', 'en-US-Journey-M'],
      apiCalls: 50,
      scriptGeneration: 10 // 10 scripts per month
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
      'Google Chirp3 + Gemini voices',
      'High quality audio',
      'Unlimited script generation',
      'Priority email support',
      'Usage analytics'
    ],
    limits: {
      monthlyCharacters: 25000,
      voices: ['Puck', 'Charon', 'Kore', 'en-US-Journey-F', 'en-US-Journey-M', 'en-US-Studio-Q'],
      apiCalls: 1000,
      scriptGeneration: -1 // Unlimited
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
      'All premium voices (Gemini + Google HD)',
      'Ultra-high quality audio',
      'Unlimited script generation',
      'Style control features',
      'Priority support',
      'Advanced analytics',
      'API access'
    ],
    limits: {
      monthlyCharacters: 100000,
      voices: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'en-US-Journey-F', 'en-US-Journey-M', 'en-US-Studio-Q', 'en-US-Studio-M'],
      apiCalls: 5000,
      scriptGeneration: -1 // Unlimited
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
      'Unlimited script generation',
      'Advanced style control',
      '24/7 priority support',
      'Custom integrations',
      'White-label solution',
      'Dedicated account manager'
    ],
    limits: {
      monthlyCharacters: 500000,
      voices: 'all',
      apiCalls: 5000,
      scriptGeneration: -1 // Unlimited
    },
    popular: false
  }
};

const GEMINI_25_VOICES = {
  'en-US': [
    { name: 'Puck', displayName: 'Puck (Playful, Young) - Gemini', provider: 'gemini' },
    { name: 'Charon', displayName: 'Charon (Serious, Mature) - Gemini', provider: 'gemini' },
    { name: 'Kore', displayName: 'Kore (Warm, Friendly) - Gemini', provider: 'gemini' },
    { name: 'Fenrir', displayName: 'Fenrir (Deep, Authoritative) - Gemini', provider: 'gemini' },
    { name: 'Aoede', displayName: 'Aoede (Musical, Expressive) - Gemini', provider: 'gemini' }
  ],
  'en-GB': [
    { name: 'Puck', displayName: 'Puck UK (Playful British) - Gemini', provider: 'gemini' },
    { name: 'Charon', displayName: 'Charon UK (Serious British) - Gemini', provider: 'gemini' },
    { name: 'Kore', displayName: 'Kore UK (Warm British) - Gemini', provider: 'gemini' }
  ],
  'es-US': [
    { name: 'Puck', displayName: 'Puck Spanish (Playful) - Gemini', provider: 'gemini' },
    { name: 'Charon', displayName: 'Charon Spanish (Serious) - Gemini', provider: 'gemini' },
    { name: 'Kore', displayName: 'Kore Spanish (Warm) - Gemini', provider: 'gemini' }
  ]
};

const GOOGLE_CHIRP3_VOICES = {
  'en-US': [
    { name: 'en-US-Journey-F', displayName: 'Journey (Female) - Google Chirp3 HD', provider: 'google', type: 'NEURAL2' },
    { name: 'en-US-Journey-M', displayName: 'Journey (Male) - Google Chirp3 HD', provider: 'google', type: 'NEURAL2' },
    { name: 'en-US-Studio-Q', displayName: 'Studio Q (Neutral) - Google HD', provider: 'google', type: 'STUDIO' },
    { name: 'en-US-Studio-M', displayName: 'Studio M (Male) - Google HD', provider: 'google', type: 'STUDIO' },
    { name: 'en-US-News-K', displayName: 'News K (Clear) - Google HD', provider: 'google', type: 'NEWS' },
    { name: 'en-US-News-L', displayName: 'News L (Professional) - Google HD', provider: 'google', type: 'NEWS' }
  ],
  'en-GB': [
    { name: 'en-GB-Journey-F', displayName: 'Journey UK (Female) - Google Chirp3', provider: 'google', type: 'NEURAL2' },
    { name: 'en-GB-Studio-B', displayName: 'Studio B UK (Male) - Google HD', provider: 'google', type: 'STUDIO' },
    { name: 'en-GB-News-G', displayName: 'News G UK (Clear) - Google HD', provider: 'google', type: 'NEWS' }
  ],
  'es-US': [
    { name: 'es-US-Journey-F', displayName: 'Journey ES (Female) - Google Chirp3', provider: 'google', type: 'NEURAL2' },
    { name: 'es-US-Studio-B', displayName: 'Studio B ES (Male) - Google HD', provider: 'google', type: 'STUDIO' }
  ],
  'fr-FR': [
    { name: 'fr-FR-Journey-F', displayName: 'Journey FR (Female) - Google Chirp3', provider: 'google', type: 'NEURAL2' },
    { name: 'fr-FR-Studio-A', displayName: 'Studio A FR (Male) - Google HD', provider: 'google', type: 'STUDIO' }
  ],
  'de-DE': [
    { name: 'de-DE-Journey-F', displayName: 'Journey DE (Female) - Google Chirp3', provider: 'google', type: 'NEURAL2' },
    { name: 'de-DE-Studio-B', displayName: 'Studio B DE (Male) - Google HD', provider: 'google', type: 'STUDIO' }
  ],
  'hi-IN': [
    { name: 'hi-IN-Journey-F', displayName: 'Journey Hindi (Female) - Google Chirp3', provider: 'google', type: 'NEURAL2' },
    { name: 'hi-IN-Studio-A', displayName: 'Studio Hindi (Male) - Google HD', provider: 'google', type: 'STUDIO' }
  ]
};

// Combined voice list for easier access
const ALL_VOICES = {};
Object.keys(GEMINI_25_VOICES).forEach(lang => {
  ALL_VOICES[lang] = [
    ...GEMINI_25_VOICES[lang],
    ...(GOOGLE_CHIRP3_VOICES[lang] || [])
  ];
});

const SCRIPT_TYPES = {
  youtube: {
    name: 'YouTube Video',
    description: 'Engaging scripts for YouTube content',
    targetAudience: 'YouTube viewers',
    keyElements: ['hook', 'main content', 'call-to-action', 'engagement'],
    promptTemplate: 'Create an engaging YouTube video script that hooks viewers in the first 15 seconds'
  },
  advertising: {
    name: 'Advertisement',
    description: 'Compelling advertising copy',
    targetAudience: 'potential customers',
    keyElements: ['problem', 'solution', 'benefits', 'call-to-action'],
    promptTemplate: 'Create a persuasive advertisement script that highlights benefits and drives action'
  },
  product_demo: {
    name: 'Product Demo',
    description: 'Product demonstration scripts',
    targetAudience: 'potential buyers',
    keyElements: ['introduction', 'features', 'benefits', 'demonstration', 'conclusion'],
    promptTemplate: 'Create a clear product demonstration script that showcases features and benefits'
  },
  reel: {
    name: 'Social Media Reel',
    description: 'Short-form social content',
    targetAudience: 'social media users',
    keyElements: ['quick hook', 'key message', 'visual cues', 'trending elements'],
    promptTemplate: 'Create a short, punchy social media reel script designed to go viral'
  }
};

const SCRIPT_STYLES = {
  professional: {
    name: 'Professional',
    description: 'Formal and business-oriented',
    tone: 'formal, authoritative, trustworthy',
    language: 'business terminology, clear and concise'
  },
  casual: {
    name: 'Casual',
    description: 'Friendly and conversational',
    tone: 'relaxed, approachable, friendly',
    language: 'everyday language, conversational'
  },
  energetic: {
    name: 'Energetic',
    description: 'High-energy and exciting',
    tone: 'enthusiastic, dynamic, motivating',
    language: 'action words, exclamations, power words'
  },
  informative: {
    name: 'Informative',
    description: 'Educational and detailed',
    tone: 'knowledgeable, clear, instructional',
    language: 'explanatory, step-by-step, detailed'
  },
  humorous: {
    name: 'Humorous',
    description: 'Fun and entertaining',
    tone: 'witty, playful, entertaining',
    language: 'jokes, wordplay, light-hearted references'
  },
  emotional: {
    name: 'Emotional',
    description: 'Touching and heartfelt',
    tone: 'sincere, moving, empathetic',
    language: 'emotional words, personal stories, relatable content'
  }
};

module.exports = {
  PRICING_PLANS,
  GEMINI_25_VOICES,
  GOOGLE_CHIRP3_VOICES,
  ALL_VOICES,
  SCRIPT_TYPES,
  SCRIPT_STYLES
};