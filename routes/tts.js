const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { checkUsageLimits } = require('../middleware/usageLimits');
const { GEMINI_25_VOICES, PRICING_PLANS } = require('../config/constants');
const { generateSpeech, checkVoiceAccess, uploadsDir } = require('../services/ttsService');
const { updateUsage } = require('../services/userService');

// Get available languages
router.get('/languages', (req, res) => {
  try {
    const languages = Object.keys(GEMINI_25_VOICES).map(lang => {
      let displayName;
      try {
        const langCode = lang.split('-')[0];
        const countryCode = lang.split('-')[1];
        const langName = new Intl.DisplayNames(['en'], { type: 'language' }).of(langCode);
        const countryName = new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode);
        displayName = `${langName} (${countryName})`;
      } catch {
        displayName = lang;
      }
      
      return {
        code: lang,
        name: displayName,
        voiceCount: GEMINI_25_VOICES[lang].length
      };
    });

    res.json({
      success: true,
      languages,
      model: 'Gemini + Google TTS Chirp3 HD'
    });
  } catch (error) {
    console.error('Error getting languages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available languages'
    });
  }
});

// Get voices for a specific language
router.get('/voices/:languageCode', (req, res) => {
  try {
    const { languageCode } = req.params;
    const voices = GEMINI_25_VOICES[languageCode] || [];
    
    res.json({
      success: true,
      voices: voices.map((voice, index) => ({
        id: `${languageCode}-${index}`,
        name: voice.name,
        displayName: voice.displayName,
        languageCode,
        model: voice.name.startsWith('Chirp3-HD-') ? 'Google TTS Chirp3 HD' : 'Gemini 2.5 Flash Preview'
      }))
    });
  } catch (error) {
    console.error('Error getting voices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get voices for language'
    });
  }
});

// Speech generation handler function
async function generateSpeechHandler(req, res) {
  try {
    const { text, voiceId, languageCode, speed, pitch, style } = req.body;
    const genAI = req.app.locals.services.genAI;

    // Validation
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Text is too long (max 5000 characters)'
      });
    }

    // Check voice access
    const voices = GEMINI_25_VOICES[languageCode] || [];
    const voiceIndex = parseInt(voiceId.split('-').pop());
    const selectedVoice = voices[voiceIndex];

    if (!selectedVoice) {
      return res.status(400).json({
        success: false,
        error: 'Invalid voice selection'
      });
    }

    // Check if user has access to this voice
    const accessCheck = checkVoiceAccess(req.userPlan, selectedVoice.name);
    if (!accessCheck.allowed) {
      return res.status(403).json({
        success: false,
        error: `Voice "${selectedVoice.name}" not available in your plan. Please upgrade to access premium voices.`,
        availableVoices: accessCheck.voices
      });
    }

    // Check if required services are available
    const isChirp3Voice = selectedVoice.name.startsWith('Chirp3-HD-');
    if (isChirp3Voice && !req.app.locals.services.googleTTS) {
      return res.status(500).json({
        success: false,
        error: 'Google Text-to-Speech service not available. Please check Google TTS configuration.'
      });
    }

    if (!isChirp3Voice && !genAI) {
      return res.status(500).json({
        success: false,
        error: 'Gemini 2.5 Flash Preview TTS service not available. Please check GEMINI_API_KEY.'
      });
    }

    // Generate speech
    const result = await generateSpeech(genAI, {
      text, voiceId, languageCode, speed, pitch, style
    });

    // Update usage tracking for authenticated users
    if (req.user) {
      updateUsage(req.user.id, text.length, 1);
    }

    res.json({
      success: true,
      audioId: result.audioId,
      filename: result.filename,
      url: `/api/audio/${result.audioId}`,
      downloadUrl: `/api/download/${result.audioId}`,
      duration: Math.ceil(text.length * 0.06),
      voice: result.voice.displayName,
      language: result.languageCode,
      model: result.serviceUsed,
      audioFormat: 'WAV (24kHz, 16-bit, Mono)',
      charactersUsed: result.charactersUsed,
      remainingCharacters: req.user && req.userPlan ? 
        (req.userPlan.limits.monthlyCharacters === -1 ? 
          'Unlimited' : 
          Math.max(0, req.userPlan.limits.monthlyCharacters - (req.userUsage.monthlyCharacters + text.length))
        ) : null
    });

  } catch (error) {
    console.error('TTS generation error:', error);
    
    let errorMessage = 'Failed to generate speech';
    
    if (error.message?.includes('API key')) {
      errorMessage = 'Invalid or missing API key. Please check service configuration.';
    } else if (error.message?.includes('quota')) {
      errorMessage = 'API quota exceeded. Please try again later.';
    } else if (error.message?.includes('Google TTS')) {
      errorMessage = 'Google Text-to-Speech service error. Please check configuration.';
    } else if (error.message?.includes('Gemini')) {
      errorMessage = 'Gemini API service error. Please check GEMINI_API_KEY.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Generate speech routes (both endpoints supported)
router.post('/generate-speech', optionalAuth, checkUsageLimits, generateSpeechHandler);
router.post('/generate-script', optionalAuth, checkUsageLimits, generateSpeechHandler);

// Serve audio files
router.get('/audio/:audioId', async (req, res) => {
  try {
    const { audioId } = req.params;
    const filename = `tts-${audioId}.wav`;
    const filepath = path.join(uploadsDir, filename);
    
    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Audio file not found'
      });
    }
    
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(filepath);
    
  } catch (error) {
    console.error('Error serving audio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve audio file'
    });
  }
});

// Download audio files
router.get('/download/:audioId', async (req, res) => {
  try {
    const { audioId } = req.params;
    const filename = `tts-${audioId}.wav`;
    const filepath = path.join(uploadsDir, filename);
    
    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Audio file not found'
      });
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="tts-${audioId}.wav"`);
    res.setHeader('Content-Type', 'audio/wav');
    res.sendFile(filepath);
    
  } catch (error) {
    console.error('Error downloading audio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download audio file'
    });
  }
});

// Get pricing plans
router.get('/pricing/plans', (req, res) => {
  res.json({
    success: true,
    plans: Object.values(PRICING_PLANS)
  });
});

module.exports = router;