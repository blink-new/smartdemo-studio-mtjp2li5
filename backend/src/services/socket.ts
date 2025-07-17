import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Recording } from '../models/Recording.js';
import { logger } from '../utils/logger.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

import { Socket } from 'socket.io';

export const setupSocketHandlers = (io: SocketIOServer) => {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key'
      ) as { userId: string };

      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = decoded.userId;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`User connected: ${socket.user.email} (${socket.id})`);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Handle project collaboration
    socket.on('join-project', async (projectId: string) => {
      try {
        const project = await Project.findById(projectId);
        if (!project) {
          socket.emit('error', { message: 'Project not found' });
          return;
        }

        // Check if user has access to this project
        const hasAccess = project.owner.toString() === socket.userId ||
          project.collaborators.some(collab => collab.user.toString() === socket.userId);

        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        socket.join(`project:${projectId}`);
        
        // Notify other users in the project
        socket.to(`project:${projectId}`).emit('user-joined', {
          userId: socket.userId,
          user: {
            firstName: socket.user.firstName,
            lastName: socket.user.lastName,
            email: socket.user.email,
            avatar: socket.user.avatar
          },
          timestamp: new Date()
        });

        logger.info(`User ${socket.user.email} joined project ${projectId}`);
      } catch (error) {
        logger.error('Join project error:', error);
        socket.emit('error', { message: 'Failed to join project' });
      }
    });

    // Handle leaving project
    socket.on('leave-project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
      
      // Notify other users in the project
      socket.to(`project:${projectId}`).emit('user-left', {
        userId: socket.userId,
        timestamp: new Date()
      });

      logger.info(`User ${socket.user.email} left project ${projectId}`);
    });

    // Handle real-time script editing
    socket.on('script-edit', async (data: {
      recordingId: string;
      segmentId: string;
      text: string;
      cursor: number;
    }) => {
      try {
        const recording = await Recording.findById(data.recordingId)
          .populate('project', 'owner collaborators');

        if (!recording) {
          socket.emit('error', { message: 'Recording not found' });
          return;
        }

        const project = recording.project as any;
        const hasEditAccess = project.owner.toString() === socket.userId ||
          project.collaborators.some((collab: any) => 
            collab.user.toString() === socket.userId && collab.role === 'editor'
          );

        if (!hasEditAccess) {
          socket.emit('error', { message: 'Edit access denied' });
          return;
        }

        // Broadcast the edit to other users in the project
        socket.to(`project:${project._id}`).emit('script-edit-broadcast', {
          recordingId: data.recordingId,
          segmentId: data.segmentId,
          text: data.text,
          cursor: data.cursor,
          userId: socket.userId,
          user: {
            firstName: socket.user.firstName,
            lastName: socket.user.lastName
          },
          timestamp: new Date()
        });

        // Update the recording in database (debounced in real implementation)
        const segment = recording.script.segments.find(seg => seg.id === data.segmentId);
        if (segment) {
          segment.text = data.text;
          await recording.save();
        }
      } catch (error) {
        logger.error('Script edit error:', error);
        socket.emit('error', { message: 'Failed to process script edit' });
      }
    });

    // Handle cursor position updates
    socket.on('cursor-position', (data: {
      recordingId: string;
      segmentId: string;
      position: number;
    }) => {
      // Broadcast cursor position to other users
      socket.broadcast.emit('cursor-position-broadcast', {
        ...data,
        userId: socket.userId,
        user: {
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          avatar: socket.user.avatar
        }
      });
    });

    // Handle video processing progress updates
    socket.on('subscribe-processing', (recordingId: string) => {
      socket.join(`processing:${recordingId}`);
      logger.info(`User ${socket.user.email} subscribed to processing updates for ${recordingId}`);
    });

    socket.on('unsubscribe-processing', (recordingId: string) => {
      socket.leave(`processing:${recordingId}`);
      logger.info(`User ${socket.user.email} unsubscribed from processing updates for ${recordingId}`);
    });

    // Handle comments on recordings
    socket.on('add-comment', async (data: {
      recordingId: string;
      text: string;
      timestamp: number;
      coordinates?: { x: number; y: number };
    }) => {
      try {
        const recording = await Recording.findById(data.recordingId)
          .populate('project', 'owner collaborators');

        if (!recording) {
          socket.emit('error', { message: 'Recording not found' });
          return;
        }

        const project = recording.project as any;
        const hasAccess = project.owner.toString() === socket.userId ||
          project.collaborators.some((collab: any) => collab.user.toString() === socket.userId);

        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        const comment = {
          id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: data.text,
          timestamp: data.timestamp,
          coordinates: data.coordinates,
          user: {
            id: socket.userId,
            firstName: socket.user.firstName,
            lastName: socket.user.lastName,
            avatar: socket.user.avatar
          },
          createdAt: new Date()
        };

        // Broadcast comment to all users in the project
        io.to(`project:${project._id}`).emit('comment-added', {
          recordingId: data.recordingId,
          comment
        });

        logger.info(`Comment added to recording ${data.recordingId} by ${socket.user.email}`);
      } catch (error) {
        logger.error('Add comment error:', error);
        socket.emit('error', { message: 'Failed to add comment' });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (data: { recordingId: string; segmentId: string }) => {
      socket.broadcast.emit('typing-start-broadcast', {
        ...data,
        userId: socket.userId,
        user: {
          firstName: socket.user.firstName,
          lastName: socket.user.lastName
        }
      });
    });

    socket.on('typing-stop', (data: { recordingId: string; segmentId: string }) => {
      socket.broadcast.emit('typing-stop-broadcast', {
        ...data,
        userId: socket.userId
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.user.email} (${socket.id})`);
      
      // Notify all projects the user was in
      socket.rooms.forEach(room => {
        if (room.startsWith('project:')) {
          socket.to(room).emit('user-disconnected', {
            userId: socket.userId,
            timestamp: new Date()
          });
        }
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });

  // Helper function to emit processing progress
  const emitProcessingProgress = (recordingId: string, progress: number, status: string) => {
    io.to(`processing:${recordingId}`).emit('processing-progress', {
      recordingId,
      progress,
      status,
      timestamp: new Date()
    });
  };

  // Helper function to emit export progress
  const emitExportProgress = (jobId: string, progress: number, status: string) => {
    io.to(`export:${jobId}`).emit('export-progress', {
      jobId,
      progress,
      status,
      timestamp: new Date()
    });
  };

  return {
    emitProcessingProgress,
    emitExportProgress
  };
};