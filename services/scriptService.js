// services/scriptService.js - Script generation service
const { SCRIPT_TYPES, SCRIPT_STYLES } = require('../config/constants');

const generateScript = async (genAI, params) => {
  const { topic, type, style, duration, userId } = params;

  // Get script type and style configurations
  const scriptType = SCRIPT_TYPES[type];
  const scriptStyle = SCRIPT_STYLES[style];

  if (!scriptType || !scriptStyle) {
    throw new Error('Invalid script type or style');
  }

  console.log(`🎬 Generating ${scriptType.name} script with ${scriptStyle.name} style for topic: "${topic.substring(0, 50)}..."`);

  // Build the prompt for script generation
  let prompt = `Generate a clean ${scriptType.name.toLowerCase()} script with a ${scriptStyle.name.toLowerCase()} tone for text-to-speech conversion.

Topic/Idea: ${topic}

Requirements:
- Script Type: ${scriptType.name} - ${scriptType.description}
- Style: ${scriptStyle.name} - ${scriptStyle.description}
- Target Audience: ${scriptType.targetAudience}
- Key Elements: ${scriptType.keyElements.join(', ')}`;

  if (duration && duration.trim()) {
    prompt += `\n- Duration: ${duration}`;
  }

  prompt += `

CRITICAL FORMATTING RULES FOR TEXT-TO-SPEECH:
- Output ONLY the spoken text that should be read aloud
- NO markdown formatting (no **bold**, *italics*, etc.)
- NO stage directions or instructions in brackets like (pause), [music], etc.
- NO titles, headers, or labels like "Advertisement Script:" or "Narrator:"
- NO timing markers like (0:00-0:15)
- NO meta-commentary or notes
- Write in complete sentences that flow naturally when spoken
- Use punctuation for natural speech rhythm and breathing
- Add natural pauses with ellipses... for dramatic effect
- Use exclamation points! for emphasis and energy
- Include question marks? to create natural inflection
- Use varied sentence lengths for natural rhythm
- If multiple speakers, clearly indicate speaker changes with line breaks
- Focus on what the voice should actually say with natural speech patterns

Generate a clean, TTS-ready script with natural voice effects:`;

  try {
    console.log('🔄 Calling Gemini 2.5 Flash Preview for script generation...');

    // Configure the AI request for text generation (matching TTS service format)
    const request = {
      model: 'gemini-2.5-flash-preview',
      contents: [{ 
        parts: [{ text: prompt }] 
      }],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    // Generate script using Gemini API
    const response = await genAI.models.generateContent(request);
    
    // Extract text from response
    const generatedText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('No script content received from Gemini API');
    }

    // Calculate script metrics
    const wordCount = generatedText.split(/\s+/).length;
    const estimatedDuration = Math.ceil(wordCount / 150); // ~150 words per minute

    console.log(`✅ Script generated successfully: ${wordCount} words, ~${estimatedDuration} minutes`);
    
    return {
      script: generatedText,
      type: scriptType.name,
      style: scriptStyle.name,
      wordCount,
      estimatedDuration: `~${estimatedDuration} minute${estimatedDuration !== 1 ? 's' : ''}`
    };

  } catch (error) {
    console.error('Gemini script generation error:', error);
    
    // Handle specific error types
    if (error.message?.includes('SAFETY')) {
      throw new Error('Content blocked by safety filters. Please try a different topic or style.');
    } else if (error.message?.includes('QUOTA_EXCEEDED')) {
      throw new Error('API quota exceeded. Please try again later.');
    } else if (error.message?.includes('API_KEY_INVALID')) {
      throw new Error('Invalid API key configuration.');
    }
    
    throw new Error(`Script generation failed: ${error.message}`);
  }
};

module.exports = {
  generateScript
};