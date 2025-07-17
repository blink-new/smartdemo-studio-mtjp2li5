import express from 'express';
import Joi from 'joi';
import { Project } from '../models/Project.js';
import { Recording } from '../models/Recording.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Validation schemas
const createProjectSchema = Joi.object({
  title: Joi.string().required().max(200),
  description: Joi.string().optional().max(1000),
  settings: Joi.object({
    resolution: Joi.string().valid('720p', '1080p', '4k').optional(),
    frameRate: Joi.number().valid(30, 60).optional(),
    audioQuality: Joi.string().valid('standard', 'high').optional(),
    autoSave: Joi.boolean().optional(),
    backgroundMusic: Joi.boolean().optional()
  }).optional()
});

const updateProjectSchema = Joi.object({
  title: Joi.string().optional().max(200),
  description: Joi.string().optional().max(1000),
  status: Joi.string().valid('draft', 'in_progress', 'review', 'completed', 'archived').optional(),
  settings: Joi.object({
    resolution: Joi.string().valid('720p', '1080p', '4k').optional(),
    frameRate: Joi.number().valid(30, 60).optional(),
    audioQuality: Joi.string().valid('standard', 'high').optional(),
    autoSave: Joi.boolean().optional(),
    backgroundMusic: Joi.boolean().optional()
  }).optional()
});

// Get all projects for user
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {
      $or: [
        { owner: req.userId },
        { 'collaborators.user': req.userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const projects = await Project.find(query)
      .populate('owner', 'firstName lastName email avatar')
      .populate('collaborators.user', 'firstName lastName email avatar')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Project.countDocuments(query);

    res.json({
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single project
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'firstName lastName email avatar')
      .populate('collaborators.user', 'firstName lastName email avatar')
      .populate('recordings');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user has access to this project
    const hasAccess = project.owner._id.toString() === req.userId ||
      project.collaborators.some(collab => collab.user._id.toString() === req.userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ project });
  } catch (error) {
    logger.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new project
router.post('/', async (req, res) => {
  try {
    const { error, value } = createProjectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const project = new Project({
      ...value,
      owner: req.userId
    });

    await project.save();
    await project.populate('owner', 'firstName lastName email avatar');

    logger.info(`New project created: ${project.title} by user ${req.userId}`);

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    logger.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const { error, value } = updateProjectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is owner or has editor access
    const isOwner = project.owner.toString() === req.userId;
    const hasEditorAccess = project.collaborators.some(
      collab => collab.user.toString() === req.userId && collab.role === 'editor'
    );

    if (!isOwner && !hasEditorAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    Object.assign(project, value);
    await project.save();
    await project.populate('owner', 'firstName lastName email avatar');
    await project.populate('collaborators.user', 'firstName lastName email avatar');

    logger.info(`Project updated: ${project.title} by user ${req.userId}`);

    res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    logger.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can delete project
    if (project.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only project owner can delete the project' });
    }

    // Delete associated recordings
    await Recording.deleteMany({ project: project._id });

    // Delete project
    await Project.findByIdAndDelete(req.params.id);

    logger.info(`Project deleted: ${project.title} by user ${req.userId}`);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    logger.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add collaborator
router.post('/:id/collaborators', async (req, res) => {
  try {
    const collaboratorSchema = Joi.object({
      email: Joi.string().email().required(),
      role: Joi.string().valid('editor', 'reviewer', 'viewer').required()
    });

    const { error, value } = collaboratorSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, role } = value;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can add collaborators
    if (project.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only project owner can add collaborators' });
    }

    // Find user by email
    const { User } = await import('../models/User.js');
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already a collaborator
    const existingCollaborator = project.collaborators.find(
      collab => collab.user.toString() === user._id.toString()
    );

    if (existingCollaborator) {
      return res.status(409).json({ error: 'User is already a collaborator' });
    }

    // Add collaborator
    project.collaborators.push({
      user: user._id,
      role,
      addedAt: new Date()
    });

    await project.save();
    await project.populate('collaborators.user', 'firstName lastName email avatar');

    logger.info(`Collaborator added to project ${project.title}: ${email} as ${role}`);

    res.json({
      message: 'Collaborator added successfully',
      collaborator: project.collaborators[project.collaborators.length - 1]
    });
  } catch (error) {
    logger.error('Add collaborator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove collaborator
router.delete('/:id/collaborators/:collaboratorId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can remove collaborators
    if (project.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only project owner can remove collaborators' });
    }

    // Remove collaborator
    project.collaborators = project.collaborators.filter(
      collab => collab.user.toString() !== req.params.collaboratorId
    );

    await project.save();

    logger.info(`Collaborator removed from project ${project.title}: ${req.params.collaboratorId}`);

    res.json({ message: 'Collaborator removed successfully' });
  } catch (error) {
    logger.error('Remove collaborator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;