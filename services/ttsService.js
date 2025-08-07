const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { GEMINI_25_VOICES, GOOGLE_CHIRP3_VOICES } = require('../config/constants');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Convert PCM audio data to WAV format
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

const generateSpeechGemini = async (genAI, params) => {
  const { text, voiceId, languageCode, speed = 1.0, pitch = 0.0, style = '' } = params;

  // Find the voice configuration
  const voices = GEMINI_25_VOICES[languageCode] || [];
  const voiceIndex = parseInt(voiceId.split('-').pop());
  const selectedVoice = voices[voiceIndex];

  if (!selectedVoice) {
    throw new Error('Invalid voice selection');
  }

  console.log(`🎙️ Generating speech with Gemini 2.5: "${text.substring(0, 50)}..." using voice: ${selectedVoice.name}`);

  // Prepare the text with style instructions if provided
  let promptText = text;
  if (style && style.trim()) {
    promptText = `${style}: ${text}`;
  }

  // Configure the TTS request
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
  
  return {
    audioBuffer: wavBuffer,
    voice: selectedVoice,
    languageCode,
    provider: 'gemini'
  };
};

const generateSpeechGoogle = async (googleTTS, params) => {
  const { text, voiceId, languageCode, speed = 1.0, pitch = 0.0 } = params;

  // Find the voice configuration
  const voices = GOOGLE_CHIRP3_VOICES[languageCode] || [];
  const voiceIndex = parseInt(voiceId.split('-').pop());
  const selectedVoice = voices[voiceIndex];

  if (!selectedVoice) {
    throw new Error('Invalid voice selection');
  }

  console.log(`🎙️ Generating speech with Google Chirp3: "${text.substring(0, 50)}..." using voice: ${selectedVoice.name}`);

  const request = {
    input: { text: text },
    voice: {
      languageCode: languageCode,
      name: selectedVoice.name
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: speed,
      pitch: pitch * 4, // Google uses -20 to 20 range
      effectsProfileId: ['headphone-class-device']
    }
  };

  const [response] = await googleTTS.synthesizeSpeech(request);
  
  return {
    audioBuffer: response.audioContent,
    voice: selectedVoice,
    languageCode,
    provider: 'google'
  };
};

const generateSpeech = async (services, params) => {
  const { text, voiceId, languageCode, speed, pitch, style, preferredProvider = 'auto' } = params;
  
  let audioBuffer, voice, provider;
  
  // Determine which provider to use
  const isGeminiVoice = voiceId.includes('gemini-');
  const isGoogleVoice = voiceId.includes('google-');
  
  try {
    if (preferredProvider === 'google' || isGoogleVoice) {
      // Use Google TTS
      if (!services.googleTTS) {
        throw new Error('Google TTS not available, falling back to Gemini');
      }
      const result = await generateSpeechGoogle(services.googleTTS, params);
      audioBuffer = result.audioBuffer;
      voice = result.voice;
      provider = 'google';
    } else if (preferredProvider === 'gemini' || isGeminiVoice) {
      // Use Gemini TTS
      if (!services.genAI) {
        throw new Error('Gemini TTS not available, falling back to Google');
      }
      const result = await generateSpeechGemini(services.genAI, params);
      audioBuffer = result.audioBuffer;
      voice = result.voice;
      provider = 'gemini';
    } else {
      // Auto-select: prefer Google for quota efficiency, fallback to Gemini
      if (services.googleTTS && GOOGLE_CHIRP3_VOICES[languageCode]) {
        const result = await generateSpeechGoogle(services.googleTTS, params);
        audioBuffer = result.audioBuffer;
        voice = result.voice;
        provider = 'google';
      } else if (services.genAI) {
        const result = await generateSpeechGemini(services.genAI, params);
        audioBuffer = result.audioBuffer;
        voice = result.voice;
        provider = 'gemini';
      } else {
        throw new Error('No TTS services available');
      }
    }
  } catch (error) {
    console.log(`Primary provider failed: ${error.message}, trying fallback...`);
    
    // Fallback logic
    if (provider !== 'google' && services.googleTTS && GOOGLE_CHIRP3_VOICES[languageCode]) {
      const result = await generateSpeechGoogle(services.googleTTS, params);
      audioBuffer = result.audioBuffer;
      voice = result.voice;
      provider = 'google';
    } else if (provider !== 'gemini' && services.genAI) {
      const result = await generateSpeechGemini(services.genAI, params);
      audioBuffer = result.audioBuffer;
      voice = result.voice;
      provider = 'gemini';
    } else {
      throw error;
    }
  }
  
  // Generate unique filename
  const audioId = uuidv4();
  const extension = provider === 'google' ? 'mp3' : 'wav';
  const filename = `tts-${provider}-${audioId}.${extension}`;
  const filepath = path.join(uploadsDir, filename);
  
  // Save audio file
  await fs.writeFile(filepath, audioBuffer);
  
  console.log(`✅ Audio generated successfully with ${provider}: ${filename}`);
  
  return {
    audioId,
    filename,
    voice,
    languageCode,
    provider,
    charactersUsed: text.length
  };
};

const checkVoiceAccess = (userPlan, voiceName) => {
  if (!userPlan) return { allowed: true, voices: ['Puck', 'Kore', 'en-US-Journey-F'] };
  
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