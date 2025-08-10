const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const { GEMINI_25_VOICES } = require('../config/constants');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Initialize Google TTS client
let googleTTSClient = null;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_TTS_API_KEY) {
    googleTTSClient = new TextToSpeechClient();
    console.log('✅ Google Text-to-Speech initialized');
  }
} catch (error) {
  console.log('⚠️  Google TTS not configured:', error.message);
}

// Convert PCM audio data to WAV format (for Gemini voices)
function convertPCMToWAV(pcmData, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const dataSize = pcmData.length;
  const blockAlign = numChannels * bitsPerSample / 8;
  const byteRate = sampleRate * blockAlign;
  const fileSize = 36 + dataSize;
  
  // Create WAV header
  const header = Buffer.alloc(44);
  let offset = 0;
  
  // RIFF chunk descriptor
  header.write('RIFF', offset); offset += 4;
  header.writeUInt32LE(fileSize, offset); offset += 4;
  header.write('WAVE', offset); offset += 4;
  
  // fmt sub-chunk
  header.write('fmt ', offset); offset += 4;
  header.writeUInt32LE(16, offset); offset += 4; // PCM
  header.writeUInt16LE(1, offset); offset += 2; // Audio format
  header.writeUInt16LE(numChannels, offset); offset += 2;
  header.writeUInt32LE(sampleRate, offset); offset += 4;
  header.writeUInt32LE(byteRate, offset); offset += 4;
  header.writeUInt16LE(blockAlign, offset); offset += 2;
  header.writeUInt16LE(bitsPerSample, offset); offset += 2;
  
  // data sub-chunk
  header.write('data', offset); offset += 4;
  header.writeUInt32LE(dataSize, offset);
  
  // Combine header and PCM data
  return Buffer.concat([header, pcmData]);
}

const generateGeminiSpeech = async (genAI, params) => {
  const { text, voiceId, languageCode, selectedVoice, speed = 1.0, pitch = 0.0, style = '' } = params;

  console.log(`🎙️ Generating Gemini speech for: "${text.substring(0, 50)}..." using voice: ${selectedVoice.name}`);

  // Prepare the text with style instructions if provided
  let promptText = text;
  if (style && style.trim()) {
    promptText = `${style}: ${text}`;
  }

  // Configure the TTS request for Gemini
  const request = {
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ 
      parts: [{ text: promptText }] 
    }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { 
            voiceName: selectedVoice.name 
          }
        }
      }
    }
  };

  console.log('🔄 Calling Gemini 2.5 Flash Preview TTS API...');

  // Generate speech using the Gemini API
  const response = await genAI.models.generateContent(request);
  
  // Extract audio data from response
  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
  if (!audioData) {
    throw new Error('No audio data received from Gemini API');
  }

  // Convert base64 audio data to buffer
  const audioBuffer = Buffer.from(audioData, 'base64');
  
  // Convert PCM to WAV format
  const wavBuffer = convertPCMToWAV(audioBuffer, 24000, 1, 16);
  
  console.log(`✅ Gemini 2.5 Flash Preview audio generated successfully`);
  
  return wavBuffer;
};

const generateGoogleTTSSpeech = async (params) => {
  const { text, languageCode, selectedVoice, speed = 1.0, pitch = 0.0 } = params;

  if (!googleTTSClient) {
    throw new Error('Google Text-to-Speech not configured. Please set up GOOGLE_APPLICATION_CREDENTIALS.');
  }

  // Extract the actual Chirp3 voice name (remove the HD prefix for API)
  let voiceName = selectedVoice.name;
  if (voiceName.startsWith('Chirp3-HD-')) {
    // Format: "languageCode-Chirp3-voicename" (e.g., "hi-IN-Chirp3-Alnilam")
    const chirpName = voiceName.replace('Chirp3-HD-', '');
    voiceName = `${languageCode}-Chirp3-${chirpName}`;
  }

  console.log(`🎙️ Generating Google TTS speech using voice: ${voiceName}`);

  // Validate and clean text input
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Text input is empty or invalid');
  }

  // Configure the Google TTS request
  const audioConfig = {
    audioEncoding: 'LINEAR16',
    speakingRate: Math.max(0.25, Math.min(4.0, speed)), // Clamp speed between 0.25 and 4.0
    sampleRateHertz: 24000,
  };

  // Chirp3 HD voices don't support pitch parameters
  if (!selectedVoice.name.startsWith('Chirp3-HD-')) {
    audioConfig.pitch = Math.max(-20, Math.min(20, (pitch - 1.0) * 20)); // Clamp pitch
  }

  const request = {
    input: { text: cleanText },
    voice: {
      languageCode: languageCode,
      name: voiceName
    },
    audioConfig: audioConfig,
  };

  console.log('🔄 Calling Google Text-to-Speech API...');

  // Generate speech using Google TTS
  const [response] = await googleTTSClient.synthesizeSpeech(request);
  
  if (!response.audioContent) {
    throw new Error('No audio content received from Google TTS API');
  }

  console.log(`✅ Google TTS audio generated successfully`);
  
  return response.audioContent;
};

const generateSpeech = async (genAI, params) => {
  const { text, voiceId, languageCode, speed = 1.0, pitch = 0.0, style = '' } = params;

  // Find the voice configuration
  const voices = GEMINI_25_VOICES[languageCode] || [];
  const voiceIndex = parseInt(voiceId.split('-').pop());
  const selectedVoice = voices[voiceIndex];

  if (!selectedVoice) {
    throw new Error('Invalid voice selection');
  }

  let audioBuffer;
  let serviceUsed;

  try {
    // Determine which service to use based on voice name
    if (selectedVoice.name.startsWith('Chirp3-HD-')) {
      // Use Google TTS for Chirp3 HD voices
      audioBuffer = await generateGoogleTTSSpeech({
        text,
        languageCode,
        selectedVoice,
        speed,
        pitch
      });
      serviceUsed = 'Google TTS Chirp3 HD';
    } else {
      // Use Gemini for original voices
      if (!genAI) {
        throw new Error('Gemini API not available. Please check GEMINI_API_KEY.');
      }
      audioBuffer = await generateGeminiSpeech(genAI, {
        text,
        voiceId,
        languageCode,
        selectedVoice,
        speed,
        pitch,
        style
      });
      serviceUsed = 'Gemini 2.5 Flash Preview';
    }

    // Generate unique filename
    const audioId = uuidv4();
    const filename = `tts-${audioId}.wav`;
    const filepath = path.join(uploadsDir, filename);
    
    // Save audio file
    await fs.writeFile(filepath, audioBuffer);
    
    console.log(`✅ ${serviceUsed} audio saved: ${filename}`);
    
    return {
      audioId,
      filename,
      voice: selectedVoice,
      languageCode,
      charactersUsed: text.length,
      serviceUsed
    };
  } catch (error) {
    console.error('TTS generation error:', error);
    throw new Error(`Failed to generate speech with ${selectedVoice.name}: ${error.message}`);
  }
};

const checkVoiceAccess = (userPlan, voiceName) => {
  if (!userPlan) return { allowed: true, voices: ['Puck', 'Kore', 'Chirp3-HD-Alnilam'] };
  
  const allowedVoices = userPlan.limits.voices;
  
  if (allowedVoices === 'all') {
    return { allowed: true, voices: 'all' };
  }
  
  if (Array.isArray(allowedVoices)) {
    return {
      allowed: allowedVoices.includes(voiceName),
      voices: allowedVoices
    };
  }
  
  return { allowed: false, voices: [] };
};

module.exports = {
  generateSpeech,
  checkVoiceAccess,
  uploadsDir
};