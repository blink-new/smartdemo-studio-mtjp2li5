import express from 'express';
import multer from 'multer';
import Joi from 'joi';
import { Recording } from '../models/Recording.js';
import { Project } from '../models/Project.js';
import { uploadToS3, deleteFromS3 } from '../services/storage.js';
import { processVideoQueue } from '../services/queue.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video and audio files are allowed'));
    }
  }
});

// Validation schemas
const createRecordingSchema = Joi.object({
  projectId: Joi.string().required(),
  title: Joi.string().required().max(200),
  duration: Joi.number().required().min(0),
  resolution: Joi.object({
    width: Joi.number().required(),
    height: Joi.number().required()
  }).required(),
  uiEvents: Joi.array().items(Joi.object({
    type: Joi.string().valid('click', 'keypress', 'hover', 'scroll', 'navigation').required(),
    timestamp: Joi.number().required(),
    coordinates: Joi.object({
      x: Joi.number(),
      y: Joi.number()
    }).optional(),
    element: Joi.string().optional(),
    value: Joi.string().optional(),
    metadata: Joi.object().optional()
  })).optional()
});

const updateScriptSchema = Joi.object({
  segments: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    text: Joi.string().required(),
    startTime: Joi.number().required(),
    endTime: Joi.number().required(),
    voiceSettings: Joi.object({
      voice: Joi.string().optional(),
      speed: Joi.number().min(0.5).max(2).optional(),
      emotion: Joi.string().optional()
    }).optional()
  })).required()
});

// Get recordings for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user has access to this project
    const hasAccess = project.owner.toString() === req.userId ||
      project.collaborators.some(collab => collab.user.toString() === req.userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const recordings = await Recording.find({ project: req.params.projectId })
      .sort({ createdAt: -1 });

    res.json({ recordings });
  } catch (error) {
    logger.error('Get recordings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single recording
router.get('/:id', async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id)
      .populate('project', 'title owner collaborators');

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Check if user has access to this recording
    const project = recording.project as any;
    const hasAccess = project.owner.toString() === req.userId ||
      project.collaborators.some((collab: any) => collab.user.toString() === req.userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ recording });
  } catch (error) {
    logger.error('Get recording error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload and create new recording
router.post('/', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    const { error, value } = createRecordingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { projectId, title, duration, resolution, uiEvents } = value;

    // Check if project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const hasAccess = project.owner.toString() === req.userId ||
      project.collaborators.some(collab => 
        collab.user.toString() === req.userId && 
        ['editor', 'reviewer'].includes(collab.role)
      );

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Upload video to S3
    const videoKey = `recordings/${projectId}/${Date.now()}-${req.file.originalname}`;
    const videoUrl = await uploadToS3(req.file.buffer, videoKey, req.file.mimetype);

    // Create recording
    const recording = new Recording({
      project: projectId,
      title,
      originalVideoUrl: videoUrl,
      duration,
      fileSize: req.file.size,
      resolution,
      uiEvents: uiEvents || [],
      script: {
        segments: []
      }
    });

    await recording.save();

    // Add recording to project
    project.recordings.push(recording._id);
    await project.save();

    // Queue video processing
    await processVideoQueue.add('process-video', {
      recordingId: recording._id.toString(),
      videoUrl,
      uiEvents: uiEvents || []
    });

    logger.info(`New recording created: ${title} for project ${projectId}`);

    res.status(201).json({
      message: 'Recording uploaded successfully',
      recording
    });
  } catch (error) {
    logger.error('Upload recording error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update recording script
router.put('/:id/script', async (req, res) => {
  try {
    const { error, value } = updateScriptSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const recording = await Recording.findById(req.params.id)
      .populate('project', 'owner collaborators');

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Check if user has access to edit this recording
    const project = recording.project as any;
    const hasEditAccess = project.owner.toString() === req.userId ||
      project.collaborators.some((collab: any) => 
        collab.user.toString() === req.userId && 
        collab.role === 'editor'
      );

    if (!hasEditAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update script
    recording.script.segments = value.segments;
    await recording.save();

    // Queue audio generation for updated segments
    await processVideoQueue.add('generate-audio', {
      recordingId: recording._id.toString(),
      segments: value.segments
    });

    logger.info(`Script updated for recording: ${recording.title}`);

    res.json({
      message: 'Script updated successfully',
      recording
    });
  } catch (error) {
    logger.error('Update script error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add visual effect
router.post('/:id/effects', async (req, res) => {
  try {
    const effectSchema = Joi.object({
      type: Joi.string().valid('blur', 'zoom', 'highlight', 'annotation').required(),
      startTime: Joi.number().required(),
      endTime: Joi.number().required(),
      coordinates: Joi.object({
        x: Joi.number(),
        y: Joi.number(),
        width: Joi.number(),
        height: Joi.number()
      }).optional(),
      properties: Joi.object().optional()
    });

    const { error, value } = effectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const recording = await Recording.findById(req.params.id)
      .populate('project', 'owner collaborators');

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Check if user has access to edit this recording
    const project = recording.project as any;
    const hasEditAccess = project.owner.toString() === req.userId ||
      project.collaborators.some((collab: any) => 
        collab.user.toString() === req.userId && 
        collab.role === 'editor'
      );

    if (!hasEditAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Add visual effect
    recording.visualEffects.push(value);
    await recording.save();

    logger.info(`Visual effect added to recording: ${recording.title}`);

    res.json({
      message: 'Visual effect added successfully',
      effect: recording.visualEffects[recording.visualEffects.length - 1]
    });
  } catch (error) {
    logger.error('Add visual effect error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete recording
router.delete('/:id', async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id)
      .populate('project', 'owner collaborators');

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Check if user has access to delete this recording
    const project = recording.project as any;
    const hasDeleteAccess = project.owner.toString() === req.userId;

    if (!hasDeleteAccess) {
      return res.status(403).json({ error: 'Only project owner can delete recordings' });
    }

    // Delete files from S3
    try {
      if (recording.originalVideoUrl) {
        await deleteFromS3(recording.originalVideoUrl);
      }
      if (recording.processedVideoUrl) {
        await deleteFromS3(recording.processedVideoUrl);
      }
      if (recording.audioUrl) {
        await deleteFromS3(recording.audioUrl);
      }
      if (recording.thumbnailUrl) {
        await deleteFromS3(recording.thumbnailUrl);
      }
    } catch (s3Error) {
      logger.warn('Error deleting files from S3:', s3Error);
    }

    // Remove recording from project
    await Project.findByIdAndUpdate(
      project._id,
      { $pull: { recordings: recording._id } }
    );

    // Delete recording
    await Recording.findByIdAndDelete(req.params.id);

    logger.info(`Recording deleted: ${recording.title}`);

    res.json({ message: 'Recording deleted successfully' });
  } catch (error) {
    logger.error('Delete recording error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;