const Razorpay = require('razorpay');
const { GoogleGenAI } = require('@google/genai');

function initializeServices() {
  const services = {
    razorpay: null,
    genAI: null,
    googleTTS: null
  };

  // Initialize Razorpay
  try {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      services.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
      console.log('✅ Razorpay initialized');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Razorpay:', error.message);
  }

  // Initialize Google GenAI (for Gemini voices)
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      services.genAI = new GoogleGenAI({ apiKey: geminiApiKey });
      console.log('✅ Google GenAI Gemini 2.5 Flash Preview TTS initialized');
    } else {
      console.log('💡 GEMINI_API_KEY not set - Gemini voices will be unavailable');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Google GenAI:', error.message);
  }

  // Initialize Google Text-to-Speech (for Chirp3 HD voices)
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_TTS_API_KEY) {
      // Google TTS is initialized in ttsService.js to avoid circular dependencies
      console.log('✅ Google Text-to-Speech credentials configured');
      services.googleTTS = true;
    } else {
      console.log('💡 Google TTS credentials not set - Chirp3 HD voices will be unavailable');
      console.log('   Set GOOGLE_APPLICATION_CREDENTIALS or configure service account');
    }
  } catch (error) {
    console.error('❌ Failed to check Google TTS configuration:', error.message);
  }

  return services;
}

module.exports = {
  initializeServices
};