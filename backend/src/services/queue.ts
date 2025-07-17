import Bull from 'bull';
import Redis from 'redis';
import { processVideo, generateAudio, exportVideo } from './videoProcessor.js';
import { logger } from '../utils/logger.js';

// Redis connection
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
};

// Create queues
export const processVideoQueue = new Bull('video processing', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

export const audioGenerationQueue = new Bull('audio generation', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
});

export const exportQueue = new Bull('video export', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 5,
    removeOnFail: 3,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  }
});

// Process video queue handlers
processVideoQueue.process('process-video', 5, async (job) => {
  const { recordingId, videoUrl, uiEvents } = job.data;
  
  try {
    logger.info(`Processing video for recording: ${recordingId}`);
    
    // Update progress
    job.progress(10);
    
    const result = await processVideo(recordingId, videoUrl, uiEvents, (progress) => {
      job.progress(progress);
    });
    
    logger.info(`Video processing completed for recording: ${recordingId}`);
    return result;
  } catch (error) {
    logger.error(`Video processing failed for recording ${recordingId}:`, error);
    throw error;
  }
});

// Audio generation queue handlers
audioGenerationQueue.process('generate-audio', 10, async (job) => {
  const { recordingId, segments } = job.data;
  
  try {
    logger.info(`Generating audio for recording: ${recordingId}`);
    
    job.progress(10);
    
    const result = await generateAudio(recordingId, segments, (progress) => {
      job.progress(progress);
    });
    
    logger.info(`Audio generation completed for recording: ${recordingId}`);
    return result;
  } catch (error) {
    logger.error(`Audio generation failed for recording ${recordingId}:`, error);
    throw error;
  }
});

// Export queue handlers
exportQueue.process('export-video', 3, async (job) => {
  const { recordingId, format, options } = job.data;
  
  try {
    logger.info(`Exporting video for recording: ${recordingId} in format: ${format}`);
    
    job.progress(10);
    
    const result = await exportVideo(recordingId, format, options, (progress) => {
      job.progress(progress);
    });
    
    logger.info(`Video export completed for recording: ${recordingId}`);
    return result;
  } catch (error) {
    logger.error(`Video export failed for recording ${recordingId}:`, error);
    throw error;
  }
});

// Queue event handlers
processVideoQueue.on('completed', (job, result) => {
  logger.info(`Video processing job ${job.id} completed:`, result);
});

processVideoQueue.on('failed', (job, err) => {
  logger.error(`Video processing job ${job.id} failed:`, err);
});

audioGenerationQueue.on('completed', (job, result) => {
  logger.info(`Audio generation job ${job.id} completed:`, result);
});

audioGenerationQueue.on('failed', (job, err) => {
  logger.error(`Audio generation job ${job.id} failed:`, err);
});

exportQueue.on('completed', (job, result) => {
  logger.info(`Export job ${job.id} completed:`, result);
});

exportQueue.on('failed', (job, err) => {
  logger.error(`Export job ${job.id} failed:`, err);
});

// Initialize queues
export const initializeQueues = async () => {
  try {
    // Test Redis connection
    const redis = Redis.createClient(redisConfig);
    await redis.ping();
    redis.quit();
    
    logger.info('Queue system initialized successfully');
  } catch (error) {
    logger.error('Queue initialization failed:', error);
    throw error;
  }
};

// Queue monitoring and cleanup
export const getQueueStats = async () => {
  try {
    const [videoStats, audioStats, exportStats] = await Promise.all([
      {
        waiting: await processVideoQueue.getWaiting(),
        active: await processVideoQueue.getActive(),
        completed: await processVideoQueue.getCompleted(),
        failed: await processVideoQueue.getFailed()
      },
      {
        waiting: await audioGenerationQueue.getWaiting(),
        active: await audioGenerationQueue.getActive(),
        completed: await audioGenerationQueue.getCompleted(),
        failed: await audioGenerationQueue.getFailed()
      },
      {
        waiting: await exportQueue.getWaiting(),
        active: await exportQueue.getActive(),
        completed: await exportQueue.getCompleted(),
        failed: await exportQueue.getFailed()
      }
    ]);

    return {
      videoProcessing: {
        waiting: videoStats.waiting.length,
        active: videoStats.active.length,
        completed: videoStats.completed.length,
        failed: videoStats.failed.length
      },
      audioGeneration: {
        waiting: audioStats.waiting.length,
        active: audioStats.active.length,
        completed: audioStats.completed.length,
        failed: audioStats.failed.length
      },
      export: {
        waiting: exportStats.waiting.length,
        active: exportStats.active.length,
        completed: exportStats.completed.length,
        failed: exportStats.failed.length
      }
    };
  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    throw error;
  }
};

// Clean up old jobs
export const cleanupQueues = async () => {
  try {
    await Promise.all([
      processVideoQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      processVideoQueue.clean(24 * 60 * 60 * 1000, 'failed'),
      audioGenerationQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      audioGenerationQueue.clean(24 * 60 * 60 * 1000, 'failed'),
      exportQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      exportQueue.clean(24 * 60 * 60 * 1000, 'failed')
    ]);
    
    logger.info('Queue cleanup completed');
  } catch (error) {
    logger.error('Queue cleanup failed:', error);
  }
};