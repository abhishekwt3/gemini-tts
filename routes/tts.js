const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { checkUsageLimits } = require('../middleware/usageLimits');
const { ALL_VOICES, PRICING_PLANS, SCRIPT_TYPES, SCRIPT_STYLES } = require('../config/constants');
const { generateSpeech, checkVoiceAccess, uploadsDir } = require('../services/ttsService');
const { generateScript } = require('../services/scriptService');
const { updateUsage } = require('../services/userService');

// Get available languages and voices from both providers
router.get('/languages', (req, res) => {
  try {
    const languages = Object.keys(ALL_VOICES).map(lang => {
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
        voiceCount: ALL_VOICES[lang].length
      };
    });

    res.json({
      success: true,
      languages,
      providers: ['Gemini 2.5 Flash Preview TTS', 'Google Chirp3 HD']
    });
  } catch (error) {
    console.error('Error getting languages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available languages'
    });
  }
});

// Get voices for a specific language from both providers
router.get('/voices/:languageCode', (req, res) => {
  try {
    const { languageCode } = req.params;
    const voices = ALL_VOICES[languageCode] || [];
    
    res.json({
      success: true,
      voices: voices.map((voice, index) => ({
        id: `${languageCode}-${index}`,
        name: voice.name,
        displayName: voice.displayName,
        languageCode,
        provider: voice.provider,
        type: voice.type || 'standard'
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

// Get TTS provider status
router.get('/providers/status', (req, res) => {
  try {
    const services = req.app.locals.services;
    
    res.json({
      success: true,
      providers: {
        gemini: {
          available: !!services.genAI,
          name: 'Gemini 2.5 Flash Preview TTS',
          quotaEfficient: false
        },
        google: {
          available: !!services.googleTTS,
          name: 'Google Chirp3 HD',
          quotaEfficient: true
        }
      },
      recommendation: services.googleTTS ? 'google' : 'gemini'
    });
  } catch (error) {
    console.error('Error getting provider status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get provider status'
    });
  }
});

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

// Generate speech with dual provider support
router.post('/generate-speech', optionalAuth, checkUsageLimits, async (req, res) => {
  try {
    const { text, voiceId, languageCode, speed, pitch, style, provider } = req.body;
    const services = req.app.locals.services;

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

    if (!services.genAI && !services.googleTTS) {
      return res.status(500).json({
        success: false,
        error: 'No TTS services available. Please check API configurations.'
      });
    }

    // Get voice info
    const voices = ALL_VOICES[languageCode] || [];
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

    // Generate speech
    const result = await generateSpeech(services, {
      text, 
      voiceId, 
      languageCode, 
      speed, 
      pitch, 
      style,
      preferredProvider: provider || 'auto'
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
      provider: result.provider,
      model: result.provider === 'gemini' ? 'Gemini 2.5 Flash Preview TTS' : 'Google Chirp3 HD',
      audioFormat: result.provider === 'gemini' ? 'WAV (24kHz, 16-bit, Mono)' : 'MP3 (24kHz)',
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
      errorMessage = 'Invalid or missing API key. Please check your configuration.';
    } else if (error.message?.includes('quota')) {
      errorMessage = 'API quota exceeded. Please try again later or try a different voice provider.';
    } else if (error.message?.includes('PERMISSION_DENIED')) {
      errorMessage = 'Google Cloud API permission denied. Please check your service account permissions.';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Serve audio files (supports both WAV and MP3)
router.get('/audio/:audioId', async (req, res) => {
  try {
    const { audioId } = req.params;
    
    // Try both extensions
    const possibleFiles = [
      `tts-gemini-${audioId}.wav`,
      `tts-google-${audioId}.mp3`,
      `gemini25-tts-${audioId}.wav` // Legacy format
    ];
    
    let filepath;
    let contentType;
    
    for (const filename of possibleFiles) {
      const testPath = path.join(uploadsDir, filename);
      try {
        await fs.access(testPath);
        filepath = testPath;
        contentType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
        break;
      } catch {
        continue;
      }
    }
    
    if (!filepath) {
      return res.status(404).json({
        success: false,
        error: 'Audio file not found'
      });
    }
    
    res.setHeader('Content-Type', contentType);
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
    
    // Try both extensions
    const possibleFiles = [
      `tts-gemini-${audioId}.wav`,
      `tts-google-${audioId}.mp3`,
      `gemini25-tts-${audioId}.wav` // Legacy format
    ];
    
    let filepath;
    let filename;
    
    for (const testFile of possibleFiles) {
      const testPath = path.join(uploadsDir, testFile);
      try {
        await fs.access(testPath);
        filepath = testPath;
        filename = testFile.includes('google') ? 
          `google-chirp3-${audioId}.mp3` : 
          `gemini-tts-${audioId}.wav`;
        break;
      } catch {
        continue;
      }
    }
    
    if (!filepath) {
      return res.status(404).json({
        success: false,
        error: 'Audio file not found'
      });
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav');
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