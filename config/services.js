const Razorpay = require('razorpay');
const { GoogleGenAI } = require('@google/genai');
const textToSpeech = require('@google-cloud/text-to-speech');

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

  // Initialize Google GenAI (Gemini)
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      services.genAI = new GoogleGenAI({ apiKey });
      console.log('✅ Google GenAI Gemini 2.5 Flash Preview TTS initialized');
    } else {
      console.log('💡 GEMINI_API_KEY not set');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Google GenAI:', error.message);
  }

  // Initialize Google Cloud Text-to-Speech
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT_ID) {
      const config = {};
      
      // If using service account key file
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        config.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
      
      // If using project ID and other auth methods
      if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
        config.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      }

      // If using service account key as JSON string
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        config.credentials = credentials;
        config.projectId = credentials.project_id;
      }

      services.googleTTS = new textToSpeech.TextToSpeechClient(config);
      console.log('✅ Google Cloud Text-to-Speech (Chirp3 HD) initialized');
    } else {
      console.log('💡 Google Cloud credentials not configured');
      console.log('   Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_KEY');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Google TTS:', error.message);
  }

  return services;
}

module.exports = {
  initializeServices
};