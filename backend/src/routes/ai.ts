import express from 'express';
import Joi from 'joi';
import { OpenAI } from 'openai';
import axios from 'axios';
import { Recording } from '../models/Recording.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize ElevenLabs client
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// Validation schemas
const transcribeSchema = Joi.object({
  audioUrl: Joi.string().uri().required()
});

const generateVoiceoverSchema = Joi.object({
  text: Joi.string().required(),
  voice: Joi.string().optional().default('rachel'),
  speed: Joi.number().min(0.5).max(2).optional().default(1),
  emotion: Joi.string().optional().default('neutral')
});

const detectEventsSchema = Joi.object({
  videoUrl: Joi.string().uri().required(),
  duration: Joi.number().required()
});

// Transcribe audio using OpenAI Whisper
router.post('/transcribe', async (req, res) => {
  try {
    const { error, value } = transcribeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { audioUrl } = value;

    // Download audio file
    const audioResponse = await axios.get(audioUrl, {
      responseType: 'stream'
    });

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioResponse.data,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word']
    });

    logger.info('Audio transcription completed');

    res.json({
      transcript: transcription.text,
      segments: transcription.words?.map(word => ({
        text: word.word,
        start: word.start,
        end: word.end
      })) || []
    });
  } catch (error) {
    logger.error('Transcription error:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

// Generate voiceover using ElevenLabs
router.post('/voiceover', async (req, res) => {
  try {
    const { error, value } = generateVoiceoverSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { text, voice, speed, emotion } = value;

    if (!ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    // Get available voices
    const voicesResponse = await axios.get(`${ELEVENLABS_BASE_URL}/voices`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    const voices = voicesResponse.data.voices;
    const selectedVoice = voices.find((v: any) => v.name.toLowerCase() === voice.toLowerCase()) || voices[0];

    // Generate speech
    const speechResponse = await axios.post(
      `${ELEVENLABS_BASE_URL}/text-to-speech/${selectedVoice.voice_id}`,
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: emotion === 'neutral' ? 0 : 0.5,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    // Upload audio to S3 (you'll need to implement this)
    const { uploadToS3 } = await import('../services/storage.js');
    const audioKey = `voiceovers/${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
    const audioUrl = await uploadToS3(Buffer.from(speechResponse.data), audioKey, 'audio/mpeg');

    logger.info('Voiceover generated successfully');

    res.json({
      audioUrl,
      voice: selectedVoice.name,
      duration: speechResponse.data.byteLength / 16000 // Approximate duration
    });
  } catch (error) {
    logger.error('Voiceover generation error:', error);
    res.status(500).json({ error: 'Voiceover generation failed' });
  }
});

// Get available voices from ElevenLabs
router.get('/voices', async (req, res) => {
  try {
    if (!ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    const response = await axios.get(`${ELEVENLABS_BASE_URL}/voices`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    const voices = response.data.voices.map((voice: any) => ({
      id: voice.voice_id,
      name: voice.name,
      category: voice.category,
      description: voice.description,
      preview_url: voice.preview_url
    }));

    res.json({ voices });
  } catch (error) {
    logger.error('Get voices error:', error);
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

// AI-powered event detection (mock implementation)
router.post('/detect-events', async (req, res) => {
  try {
    const { error, value } = detectEventsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { videoUrl, duration } = value;

    // This is a mock implementation
    // In a real scenario, you would use computer vision models
    // to analyze the video and detect UI interactions
    
    const mockEvents = [
      {
        type: 'click',
        timestamp: 2.5,
        coordinates: { x: 150, y: 200 },
        element: 'button',
        confidence: 0.95
      },
      {
        type: 'keypress',
        timestamp: 5.2,
        element: 'input[type="text"]',
        value: 'user@example.com',
        confidence: 0.88
      },
      {
        type: 'navigation',
        timestamp: 8.1,
        metadata: { from: '/login', to: '/dashboard' },
        confidence: 0.92
      },
      {
        type: 'hover',
        timestamp: 12.3,
        coordinates: { x: 300, y: 150 },
        element: 'nav-item',
        confidence: 0.85
      }
    ];

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    logger.info('Event detection completed');

    res.json({
      events: mockEvents,
      processingTime: 2.0,
      confidence: 0.90
    });
  } catch (error) {
    logger.error('Event detection error:', error);
    res.status(500).json({ error: 'Event detection failed' });
  }
});

// Generate subtitles from script
router.post('/subtitles', async (req, res) => {
  try {
    const subtitlesSchema = Joi.object({
      recordingId: Joi.string().required(),
      language: Joi.string().optional().default('en'),
      style: Joi.object({
        fontSize: Joi.number().optional().default(16),
        fontFamily: Joi.string().optional().default('Arial'),
        color: Joi.string().optional().default('#FFFFFF'),
        backgroundColor: Joi.string().optional().default('rgba(0,0,0,0.8)'),
        position: Joi.string().valid('bottom', 'top', 'center').optional().default('bottom')
      }).optional()
    });

    const { error, value } = subtitlesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { recordingId, language, style } = value;

    const recording = await Recording.findById(recordingId);
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Generate subtitles from script segments
    const subtitles = recording.script.segments.map(segment => ({
      text: segment.text,
      startTime: segment.startTime,
      endTime: segment.endTime,
      style: style || {}
    }));

    // Update recording with subtitles
    recording.subtitles = subtitles;
    await recording.save();

    logger.info(`Subtitles generated for recording: ${recording.title}`);

    res.json({
      message: 'Subtitles generated successfully',
      subtitles
    });
  } catch (error) {
    logger.error('Subtitle generation error:', error);
    res.status(500).json({ error: 'Subtitle generation failed' });
  }
});

// Enhance script with AI suggestions
router.post('/enhance-script', async (req, res) => {
  try {
    const enhanceSchema = Joi.object({
      script: Joi.string().required(),
      tone: Joi.string().valid('professional', 'casual', 'friendly', 'technical').optional().default('professional'),
      audience: Joi.string().optional().default('general')
    });

    const { error, value } = enhanceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { script, tone, audience } = value;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a professional script writer specializing in product demos and tutorials. 
                   Enhance the provided script to be more engaging, clear, and ${tone} in tone. 
                   The target audience is ${audience}. 
                   Maintain the original structure but improve clarity, flow, and engagement.`
        },
        {
          role: 'user',
          content: `Please enhance this script:\n\n${script}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    });

    const enhancedScript = completion.choices[0].message.content;

    logger.info('Script enhancement completed');

    res.json({
      originalScript: script,
      enhancedScript,
      improvements: [
        'Improved clarity and flow',
        'Enhanced engagement',
        `Adjusted tone to be more ${tone}`,
        'Better structure and transitions'
      ]
    });
  } catch (error) {
    logger.error('Script enhancement error:', error);
    res.status(500).json({ error: 'Script enhancement failed' });
  }
});

export default router;