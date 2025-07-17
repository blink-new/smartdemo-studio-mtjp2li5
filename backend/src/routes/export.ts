import express from 'express';
import Joi from 'joi';
import { Recording } from '../models/Recording.js';
import { Project } from '../models/Project.js';
import { exportQueue } from '../services/queue.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Validation schemas
const exportVideoSchema = Joi.object({
  recordingId: Joi.string().required(),
  format: Joi.string().valid('mp4', 'gif', 'webm').required(),
  options: Joi.object({
    resolution: Joi.string().valid('720p', '1080p', '4k').optional().default('1080p'),
    frameRate: Joi.number().valid(15, 24, 30, 60).optional().default(30),
    quality: Joi.string().valid('low', 'medium', 'high').optional().default('high'),
    includeSubtitles: Joi.boolean().optional().default(true),
    includeAudio: Joi.boolean().optional().default(true),
    startTime: Joi.number().min(0).optional(),
    endTime: Joi.number().min(0).optional(),
    watermark: Joi.object({
      enabled: Joi.boolean().default(false),
      text: Joi.string().optional(),
      position: Joi.string().valid('top-left', 'top-right', 'bottom-left', 'bottom-right').optional().default('bottom-right'),
      opacity: Joi.number().min(0).max(1).optional().default(0.7)
    }).optional()
  }).optional()
});

const exportArticleSchema = Joi.object({
  recordingId: Joi.string().required(),
  options: Joi.object({
    includeScreenshots: Joi.boolean().optional().default(true),
    screenshotInterval: Joi.number().min(1).max(30).optional().default(5),
    includeScript: Joi.boolean().optional().default(true),
    includeSteps: Joi.boolean().optional().default(true),
    format: Joi.string().valid('html', 'markdown', 'pdf').optional().default('html'),
    theme: Joi.string().valid('light', 'dark', 'minimal').optional().default('light')
  }).optional()
});

// Export video
router.post('/video', async (req, res) => {
  try {
    const { error, value } = exportVideoSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { recordingId, format, options } = value;

    // Check if recording exists and user has access
    const recording = await Recording.findById(recordingId)
      .populate('project', 'owner collaborators');

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    const project = recording.project as any;
    const hasAccess = project.owner.toString() === req.userId ||
      project.collaborators.some((collab: any) => collab.user.toString() === req.userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if recording is processed
    if (recording.processingStatus !== 'completed') {
      return res.status(400).json({ 
        error: 'Recording is not ready for export',
        status: recording.processingStatus
      });
    }

    // Add export job to queue
    const job = await exportQueue.add('export-video', {
      recordingId,
      format,
      options: options || {},
      userId: req.userId
    });

    logger.info(`Video export job created: ${job.id} for recording ${recordingId}`);

    res.json({
      message: 'Export job created successfully',
      jobId: job.id,
      format,
      estimatedTime: getEstimatedExportTime(format, recording.duration)
    });
  } catch (error) {
    logger.error('Export video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export as article/tutorial
router.post('/article', async (req, res) => {
  try {
    const { error, value } = exportArticleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { recordingId, options } = value;

    // Check if recording exists and user has access
    const recording = await Recording.findById(recordingId)
      .populate('project', 'owner collaborators title description');

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    const project = recording.project as any;
    const hasAccess = project.owner.toString() === req.userId ||
      project.collaborators.some((collab: any) => collab.user.toString() === req.userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate article content
    const article = await generateArticle(recording, project, options || {});

    logger.info(`Article generated for recording: ${recordingId}`);

    res.json({
      message: 'Article generated successfully',
      article
    });
  } catch (error) {
    logger.error('Export article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get export job status
router.get('/job/:jobId', async (req, res) => {
  try {
    const job = await exportQueue.getJob(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress();
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    res.json({
      jobId: job.id,
      state,
      progress,
      result,
      failedReason,
      createdAt: new Date(job.timestamp),
      processedOn: job.processedOn ? new Date(job.processedOn) : null,
      finishedOn: job.finishedOn ? new Date(job.finishedOn) : null
    });
  } catch (error) {
    logger.error('Get job status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get export history for a recording
router.get('/history/:recordingId', async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.recordingId)
      .populate('project', 'owner collaborators');

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    const project = recording.project as any;
    const hasAccess = project.owner.toString() === req.userId ||
      project.collaborators.some((collab: any) => collab.user.toString() === req.userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get completed export jobs for this recording
    const completedJobs = await exportQueue.getJobs(['completed'], 0, 50);
    const recordingJobs = completedJobs.filter(job => 
      job.data.recordingId === req.params.recordingId
    );

    const exports = recordingJobs.map(job => ({
      id: job.id,
      format: job.data.format,
      options: job.data.options,
      result: job.returnvalue,
      createdAt: new Date(job.timestamp),
      completedAt: job.finishedOn ? new Date(job.finishedOn) : null
    }));

    res.json({ exports });
  } catch (error) {
    logger.error('Get export history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to estimate export time
const getEstimatedExportTime = (format: string, duration: number): number => {
  const baseTime = duration * 0.5; // Base processing time
  
  switch (format) {
    case 'mp4':
      return Math.ceil(baseTime * 1.2); // MP4 is relatively fast
    case 'gif':
      return Math.ceil(baseTime * 2); // GIF takes longer due to optimization
    case 'webm':
      return Math.ceil(baseTime * 1.5); // WebM is moderate
    default:
      return Math.ceil(baseTime);
  }
};

// Helper function to generate article content
const generateArticle = async (recording: any, project: any, options: any) => {
  const steps: any[] = [];
  
  // Generate steps from UI events and script
  recording.uiEvents.forEach((event: any, index: number) => {
    const scriptSegment = recording.script.segments.find((seg: any) => 
      seg.startTime <= event.timestamp && seg.endTime >= event.timestamp
    );

    steps.push({
      stepNumber: index + 1,
      timestamp: event.timestamp,
      action: formatEventAction(event),
      description: scriptSegment?.text || `Performed ${event.type} action`,
      screenshot: options.includeScreenshots ? generateScreenshotUrl(recording, event.timestamp) : null
    });
  });

  const article = {
    title: `${project.title} - ${recording.title}`,
    description: project.description || 'Step-by-step tutorial',
    metadata: {
      duration: recording.duration,
      steps: steps.length,
      createdAt: new Date(),
      format: options.format
    },
    content: {
      introduction: generateIntroduction(project, recording),
      steps: options.includeSteps ? steps : [],
      script: options.includeScript ? recording.script.segments : [],
      conclusion: generateConclusion(project, recording)
    },
    styling: {
      theme: options.theme,
      includeScreenshots: options.includeScreenshots
    }
  };

  return article;
};

// Helper functions
const formatEventAction = (event: any): string => {
  switch (event.type) {
    case 'click':
      return `Click on ${event.element || 'element'}`;
    case 'keypress':
      return `Type "${event.value || 'text'}" in ${event.element || 'field'}`;
    case 'hover':
      return `Hover over ${event.element || 'element'}`;
    case 'scroll':
      return 'Scroll page';
    case 'navigation':
      return `Navigate to ${event.metadata?.to || 'page'}`;
    default:
      return `Perform ${event.type} action`;
  }
};

const generateScreenshotUrl = (recording: any, timestamp: number): string => {
  // This would generate a screenshot URL at the specific timestamp
  return `${recording.originalVideoUrl}?t=${timestamp}&screenshot=true`;
};

const generateIntroduction = (project: any, recording: any): string => {
  return `This tutorial will guide you through ${recording.title}. ` +
         `The process takes approximately ${Math.ceil(recording.duration / 60)} minutes to complete.`;
};

const generateConclusion = (project: any, recording: any): string => {
  return `You have successfully completed the ${recording.title} tutorial. ` +
         `For more tutorials and resources, visit our documentation.`;
};

export default router;