import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import sharp from 'sharp';
import axios from 'axios';
import { Recording } from '../models/Recording.js';
import { uploadToS3 } from './storage.js';
import { logger } from '../utils/logger.js';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic!);

const TEMP_DIR = process.env.TEMP_DIR || '/tmp';

export const processVideo = async (
  recordingId: string,
  videoUrl: string,
  uiEvents: any[],
  progressCallback: (progress: number) => void
): Promise<any> => {
  try {
    const recording = await Recording.findById(recordingId);
    if (!recording) {
      throw new Error('Recording not found');
    }

    progressCallback(20);

    // Download video file
    const videoResponse = await axios.get(videoUrl, { responseType: 'stream' });
    const tempVideoPath = path.join(TEMP_DIR, `${uuidv4()}.mp4`);
    const videoStream = require('fs').createWriteStream(tempVideoPath);
    
    videoResponse.data.pipe(videoStream);
    await new Promise((resolve, reject) => {
      videoStream.on('finish', resolve);
      videoStream.on('error', reject);
    });

    progressCallback(40);

    // Generate thumbnail
    const thumbnailPath = path.join(TEMP_DIR, `${uuidv4()}.jpg`);
    await new Promise((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .screenshots({
          timestamps: ['10%'],
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: '320x240'
        })
        .on('end', resolve)
        .on('error', reject);
    });

    progressCallback(60);

    // Upload thumbnail to S3
    const thumbnailBuffer = await fs.readFile(thumbnailPath);
    const thumbnailKey = `thumbnails/${recordingId}/${Date.now()}.jpg`;
    const thumbnailUrl = await uploadToS3(thumbnailBuffer, thumbnailKey, 'image/jpeg');

    progressCallback(80);

    // Extract audio from video
    const audioPath = path.join(TEMP_DIR, `${uuidv4()}.wav`);
    await new Promise((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .output(audioPath)
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('end', resolve)
        .on('error', reject);
    });

    // Upload audio to S3
    const audioBuffer = await fs.readFile(audioPath);
    const audioKey = `audio/${recordingId}/${Date.now()}.wav`;
    const audioUrl = await uploadToS3(audioBuffer, audioKey, 'audio/wav');

    progressCallback(90);

    // Update recording with processed data
    recording.thumbnailUrl = thumbnailUrl;
    recording.audioUrl = audioUrl;
    recording.processingStatus = 'completed';
    recording.processingProgress = 100;
    await recording.save();

    // Cleanup temp files
    await Promise.all([
      fs.unlink(tempVideoPath).catch(() => {}),
      fs.unlink(thumbnailPath).catch(() => {}),
      fs.unlink(audioPath).catch(() => {})
    ]);

    progressCallback(100);

    return {
      recordingId,
      thumbnailUrl,
      audioUrl,
      status: 'completed'
    };
  } catch (error) {
    logger.error('Video processing error:', error);
    
    // Update recording with error status
    try {
      await Recording.findByIdAndUpdate(recordingId, {
        processingStatus: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    } catch (updateError) {
      logger.error('Failed to update recording status:', updateError);
    }
    
    throw error;
  }
};

export const generateAudio = async (
  recordingId: string,
  segments: any[],
  progressCallback: (progress: number) => void
): Promise<any> => {
  try {
    const recording = await Recording.findById(recordingId);
    if (!recording) {
      throw new Error('Recording not found');
    }

    const audioUrls: string[] = [];
    const totalSegments = segments.length;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      progressCallback((i / totalSegments) * 80);

      // Generate audio for this segment using ElevenLabs
      const audioResponse = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${segment.voiceSettings?.voice || 'rachel'}`,
        {
          text: segment.text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0,
            use_speaker_boost: true
          }
        },
        {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      // Upload segment audio to S3
      const audioKey = `segments/${recordingId}/${segment.id}.mp3`;
      const audioUrl = await uploadToS3(
        Buffer.from(audioResponse.data),
        audioKey,
        'audio/mpeg'
      );

      audioUrls.push(audioUrl);
      segment.audioUrl = audioUrl;
    }

    progressCallback(90);

    // Update recording with generated audio URLs
    recording.script.segments = segments;
    await recording.save();

    progressCallback(100);

    return {
      recordingId,
      segments: segments.map((seg, index) => ({
        ...seg,
        audioUrl: audioUrls[index]
      })),
      status: 'completed'
    };
  } catch (error) {
    logger.error('Audio generation error:', error);
    throw error;
  }
};

export const exportVideo = async (
  recordingId: string,
  format: 'mp4' | 'gif' | 'webm',
  options: any,
  progressCallback: (progress: number) => void
): Promise<any> => {
  try {
    const recording = await Recording.findById(recordingId);
    if (!recording) {
      throw new Error('Recording not found');
    }

    progressCallback(10);

    // Download original video
    const videoResponse = await axios.get(recording.originalVideoUrl, { responseType: 'stream' });
    const tempVideoPath = path.join(TEMP_DIR, `${uuidv4()}.mp4`);
    const videoStream = require('fs').createWriteStream(tempVideoPath);
    
    videoResponse.data.pipe(videoStream);
    await new Promise((resolve, reject) => {
      videoStream.on('finish', resolve);
      videoStream.on('error', reject);
    });

    progressCallback(30);

    const outputPath = path.join(TEMP_DIR, `${uuidv4()}.${format}`);
    
    // Create ffmpeg command
    let command = ffmpeg(tempVideoPath);

    // Apply visual effects
    if (recording.visualEffects.length > 0) {
      const filters: string[] = [];
      
      recording.visualEffects.forEach((effect, index) => {
        const startTime = effect.startTime;
        const endTime = effect.endTime;
        
        switch (effect.type) {
          case 'blur':
            if (effect.coordinates) {
              const { x, y, width, height } = effect.coordinates;
              filters.push(
                `[0:v]crop=${width}:${height}:${x}:${y},boxblur=10:1[blurred${index}];` +
                `[0:v][blurred${index}]overlay=${x}:${y}:enable='between(t,${startTime},${endTime})'[v${index}]`
              );
            }
            break;
          case 'zoom':
            if (effect.coordinates) {
              const { x, y, width, height } = effect.coordinates;
              const scale = effect.properties?.scale || 1.5;
              filters.push(
                `[0:v]crop=${width}:${height}:${x}:${y},scale=${width * scale}:${height * scale}[zoomed${index}];` +
                `[0:v][zoomed${index}]overlay=${x - (width * (scale - 1)) / 2}:${y - (height * (scale - 1)) / 2}:enable='between(t,${startTime},${endTime})'[v${index}]`
              );
            }
            break;
          case 'highlight':
            if (effect.coordinates) {
              const { x, y, width, height } = effect.coordinates;
              filters.push(
                `[0:v]drawbox=x=${x}:y=${y}:w=${width}:h=${height}:color=yellow@0.3:t=3:enable='between(t,${startTime},${endTime})'[v${index}]`
              );
            }
            break;
        }
      });

      if (filters.length > 0) {
        command = command.complexFilter(filters.join(';'));
      }
    }

    progressCallback(50);

    // Configure output based on format
    switch (format) {
      case 'mp4':
        command = command
          .videoCodec('libx264')
          .audioCodec('aac')
          .size(options.resolution || '1920x1080')
          .fps(options.frameRate || 30);
        break;
      case 'gif':
        command = command
          .videoCodec('gif')
          .size(options.resolution || '800x600')
          .fps(options.frameRate || 15);
        break;
      case 'webm':
        command = command
          .videoCodec('libvpx-vp9')
          .audioCodec('libvorbis')
          .size(options.resolution || '1920x1080')
          .fps(options.frameRate || 30);
        break;
    }

    // Add subtitles if available
    if (recording.subtitles.length > 0) {
      const subtitlePath = path.join(TEMP_DIR, `${uuidv4()}.srt`);
      const srtContent = recording.subtitles
        .map((sub, index) => {
          const startTime = formatTime(sub.startTime);
          const endTime = formatTime(sub.endTime);
          return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`;
        })
        .join('\n');
      
      await fs.writeFile(subtitlePath, srtContent);
      command = command.addOption('-vf', `subtitles=${subtitlePath}`);
    }

    progressCallback(70);

    // Execute ffmpeg command
    await new Promise((resolve, reject) => {
      command
        .output(outputPath)
        .on('progress', (progress) => {
          const percent = Math.min(70 + (progress.percent || 0) * 0.2, 90);
          progressCallback(percent);
        })
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    progressCallback(95);

    // Upload exported video to S3
    const exportedBuffer = await fs.readFile(outputPath);
    const exportKey = `exports/${recordingId}/${Date.now()}.${format}`;
    const exportUrl = await uploadToS3(exportedBuffer, exportKey, `video/${format}`);

    // Cleanup temp files
    await Promise.all([
      fs.unlink(tempVideoPath).catch(() => {}),
      fs.unlink(outputPath).catch(() => {})
    ]);

    progressCallback(100);

    return {
      recordingId,
      format,
      exportUrl,
      fileSize: exportedBuffer.length,
      status: 'completed'
    };
  } catch (error) {
    logger.error('Video export error:', error);
    throw error;
  }
};

// Helper function to format time for SRT subtitles
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};