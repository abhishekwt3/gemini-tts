const Razorpay = require('razorpay');
const { GoogleGenAI } = require('@google/genai');

function initializeServices() {
  const services = {
    razorpay: null,
    genAI: null
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

  // Initialize Google GenAI
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

  return services;
}

module.exports = {
  initializeServices
};