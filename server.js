
// server.js - Updated with database initialization
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { generateScript } = require('./services/scriptService');


const { initializeDatabase, testConnection } = require('./config/database');
const { setupAssociations } = require('./models');
const { initializeServices } = require('./config/services');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const ttsRoutes = require('./routes/tts');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Initialize services and database
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Server will run with limited functionality.');
    }

    // Setup model associations
    setupAssociations();

    // Initialize database tables
    if (dbConnected) {
      await initializeDatabase();
    }

    // Initialize external services (Razorpay, Gemini)
    const services = initializeServices();
    
    // Make services available to routes
    app.locals.services = services;

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api', ttsRoutes);
    app.use('/api/user', userRoutes);

    // Health check endpoint
    app.get('/api/health', async (req, res) => {
      const { razorpay, genAI } = services;
      const { sequelize } = require('./config/database');
      
      let dbStatus = 'disconnected';
      try {
        await sequelize.authenticate();
        dbStatus = 'connected';
      } catch (error) {
        dbStatus = 'error';
      }
      
      res.json({
        success: true,
        status: 'healthy',
        database: dbStatus,
        ttsAvailable: !!genAI,
        paymentsAvailable: !!razorpay,
        model: 'Gemini 2.5 Flash Preview TTS',
        apiKeyConfigured: !!process.env.GEMINI_API_KEY,
        razorpayConfigured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });

    // Error handling middleware (must be last)
    app.use(errorHandler);

    // Cleanup job for old audio files
    const { startCleanupJob } = require('./utils/cleanup');
    startCleanupJob();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Gemini 2.5 Flash Preview TTS Server running on port ${PORT}`);
      console.log(`📱 Frontend available at: http://localhost:${PORT}`);
      console.log(`🔗 API health check: http://localhost:${PORT}/api/health`);
      console.log(`💳 Pricing page: http://localhost:${PORT}/pricing.html`);
      console.log(`🗄️ Database: ${process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'SQLite'}`);
      
      if (!services.genAI) {
        console.log('\n⚠️  Gemini API not configured. To enable:');
        console.log('1. Get a Gemini API key from Google AI Studio: https://aistudio.google.com/apikey');
        console.log('2. Set environment variable: export GEMINI_API_KEY="your-api-key"');
        console.log('3. Restart the server\n');
      } else {
        console.log('✅ Gemini 2.5 Flash Preview TTS ready!');
      }

      if (!services.razorpay) {
        console.log('\n⚠️  Razorpay not configured. To enable payments:');
        console.log('1. Get Razorpay keys from: https://dashboard.razorpay.com/');
        console.log('2. Set environment variables: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
        console.log('3. Restart the server\n');
      } else {
        console.log('✅ Razorpay payment gateway ready!');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();