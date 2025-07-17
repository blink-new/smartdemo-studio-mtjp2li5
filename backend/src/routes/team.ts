import express from 'express';
import Joi from 'joi';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Validation schemas
const inviteUserSchema = Joi.object({
  email: Joi.string().email().required(),
  role: Joi.string().valid('admin', 'editor', 'reviewer', 'viewer').required(),
  organization: Joi.string().optional()
});

const updateUserRoleSchema = Joi.object({
  role: Joi.string().valid('admin', 'editor', 'reviewer', 'viewer').required()
});

// Get team members (admin only)
router.get('/members', requireRole(['admin']), async (req, res) => {
  try {
    const currentUser = req.user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const role = req.query.role as string;

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {
      organization: currentUser.organization
    };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    const members = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    // Get project counts for each member
    const membersWithStats = await Promise.all(
      members.map(async (member) => {
        const projectCount = await Project.countDocuments({
          $or: [
            { owner: member._id },
            { 'collaborators.user': member._id }
          ]
        });

        return {
          ...member.toJSON(),
          stats: {
            projectCount,
            lastActive: member.lastLoginAt
          }
        };
      })
    );

    res.json({
      members: membersWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get team members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invite new team member (admin only)
router.post('/invite', requireRole(['admin']), async (req, res) => {
  try {
    const { error, value } = inviteUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, role, organization } = value;
    const currentUser = req.user;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // If user exists but in different organization, update their organization
      if (existingUser.organization !== currentUser.organization) {
        existingUser.organization = organization || currentUser.organization;
        existingUser.role = role;
        await existingUser.save();

        logger.info(`User ${email} moved to organization ${currentUser.organization}`);

        return res.json({
          message: 'User added to organization successfully',
          user: {
            id: existingUser._id,
            email: existingUser.email,
            firstName: existingUser.firstName,
            lastName: existingUser.lastName,
            role: existingUser.role,
            organization: existingUser.organization
          }
        });
      } else {
        return res.status(409).json({ error: 'User is already a team member' });
      }
    }

    // Create invitation (in a real app, you'd send an email invitation)
    // For now, we'll create a placeholder user that needs to complete registration
    const invitedUser = new User({
      email,
      password: 'temp-password-' + Math.random().toString(36), // Temporary password
      firstName: 'Invited',
      lastName: 'User',
      role,
      organization: organization || currentUser.organization,
      subscription: {
        plan: 'free',
        status: 'inactive' // Will be activated when they complete registration
      }
    });

    await invitedUser.save();

    logger.info(`User invited: ${email} to organization ${currentUser.organization}`);

    // In a real application, you would:
    // 1. Generate an invitation token
    // 2. Send an email with the invitation link
    // 3. Store the invitation in a separate collection

    res.status(201).json({
      message: 'User invitation sent successfully',
      user: {
        id: invitedUser._id,
        email: invitedUser.email,
        role: invitedUser.role,
        organization: invitedUser.organization,
        status: 'invited'
      }
    });
  } catch (error) {
    logger.error('Invite user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update team member role (admin only)
router.put('/members/:userId/role', requireRole(['admin']), async (req, res) => {
  try {
    const { error, value } = updateUserRoleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { role } = value;
    const currentUser = req.user;

    // Find the user to update
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is in the same organization
    if (user.organization !== currentUser.organization) {
      return res.status(403).json({ error: 'User is not in your organization' });
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === currentUser._id.toString()) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    // Update role
    user.role = role;
    await user.save();

    logger.info(`User role updated: ${user.email} -> ${role} by ${currentUser.email}`);

    res.json({
      message: 'User role updated successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organization: user.organization
      }
    });
  } catch (error) {
    logger.error('Update user role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove team member (admin only)
router.delete('/members/:userId', requireRole(['admin']), async (req, res) => {
  try {
    const currentUser = req.user;

    // Find the user to remove
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is in the same organization
    if (user.organization !== currentUser.organization) {
      return res.status(403).json({ error: 'User is not in your organization' });
    }

    // Prevent admin from removing themselves
    if (user._id.toString() === currentUser._id.toString()) {
      return res.status(400).json({ error: 'Cannot remove yourself from the team' });
    }

    // Check if user owns any projects
    const ownedProjects = await Project.countDocuments({ owner: user._id });
    if (ownedProjects > 0) {
      return res.status(400).json({ 
        error: 'Cannot remove user who owns projects. Transfer ownership first.',
        ownedProjects
      });
    }

    // Remove user from all project collaborations
    await Project.updateMany(
      { 'collaborators.user': user._id },
      { $pull: { collaborators: { user: user._id } } }
    );

    // Remove user
    await User.findByIdAndDelete(req.params.userId);

    logger.info(`User removed from team: ${user.email} by ${currentUser.email}`);

    res.json({ message: 'User removed from team successfully' });
  } catch (error) {
    logger.error('Remove team member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get team statistics (admin only)
router.get('/stats', requireRole(['admin']), async (req, res) => {
  try {
    const currentUser = req.user;

    // Get team member counts by role
    const roleStats = await User.aggregate([
      { $match: { organization: currentUser.organization } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Get project statistics
    const projectStats = await Project.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'ownerInfo'
        }
      },
      {
        $match: {
          'ownerInfo.organization': currentUser.organization
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await User.countDocuments({
      organization: currentUser.organization,
      lastLoginAt: { $gte: thirtyDaysAgo }
    });

    const totalUsers = await User.countDocuments({
      organization: currentUser.organization
    });

    res.json({
      team: {
        totalMembers: totalUsers,
        activeMembers: activeUsers,
        roleDistribution: roleStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {} as Record<string, number>)
      },
      projects: {
        statusDistribution: projectStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {} as Record<string, number>)
      }
    });
  } catch (error) {
    logger.error('Get team stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get team activity feed (admin only)
router.get('/activity', requireRole(['admin']), async (req, res) => {
  try {
    const currentUser = req.user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // This is a simplified activity feed
    // In a real application, you'd have a dedicated activity/audit log collection
    
    const recentProjects = await Project.find({})
      .populate('owner', 'firstName lastName email organization')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    const activities = recentProjects
      .filter((project: any) => project.owner.organization === currentUser.organization)
      .map((project: any) => ({
        id: project._id,
        type: 'project_updated',
        user: {
          name: `${project.owner.firstName} ${project.owner.lastName}`,
          email: project.owner.email
        },
        description: `Updated project "${project.title}"`,
        timestamp: project.updatedAt,
        metadata: {
          projectId: project._id,
          projectTitle: project.title,
          status: project.status
        }
      }));

    res.json({
      activities,
      pagination: {
        page,
        limit,
        total: activities.length,
        hasMore: activities.length === limit
      }
    });
  } catch (error) {
    logger.error('Get team activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;