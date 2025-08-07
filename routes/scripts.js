// routes/scripts.js - Script generation route
const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { generateScript } = require('../services/scriptService');

// Generate script
router.post('/generate-script', optionalAuth, async (req, res) => {
  try {
    const { topic, type, style, duration } = req.body;
    const genAI = req.app.locals.services.genAI;

    // Validation
    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required'
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Script type is required'
      });
    }

    if (!style) {
      return res.status(400).json({
        success: false,
        error: 'Script style is required'
      });
    }

    if (!genAI) {
      return res.status(500).json({
        success: false,
        error: 'Gemini AI service not available. Please check GEMINI_API_KEY.'
      });
    }

    // Generate script
    const result = await generateScript(genAI, {
      topic,
      type,
      style,
      duration,
      userId: req.user?.id
    });

    res.json({
      success: true,
      script: result.script,
      type: result.type,
      style: result.style,
      estimatedDuration: result.estimatedDuration,
      wordCount: result.wordCount,
      model: 'Gemini 2.5 Flash Preview'
    });

  } catch (error) {
    console.error('Script generation error:', error);
    
    let errorMessage = 'Failed to generate script with Gemini 2.5 Flash Preview';
    
    if (error.message?.includes('API key')) {
      errorMessage = 'Invalid or missing Gemini API key. Please check GEMINI_API_KEY environment variable.';
    } else if (error.message?.includes('quota')) {
      errorMessage = 'Gemini API quota exceeded. Please try again later.';
    } else if (error.message?.includes('safety')) {
      errorMessage = 'Content blocked by safety filters. Please try a different topic or style.';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;