import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

// Extend Request interface to include userId
declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    user?: any;
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Access denied. No token provided.' });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as { userId: string };

    // Verify user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'Invalid token. User not found.' });
      return;
    }

    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!roles.includes(req.user.role)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      next();
    } catch (error) {
      logger.error('Role middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

export const requireSubscription = (plans: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!plans.includes(req.user.subscription.plan)) {
        res.status(403).json({ 
          error: 'Subscription upgrade required',
          requiredPlans: plans,
          currentPlan: req.user.subscription.plan
        });
        return;
      }

      // Check if subscription is active
      if (req.user.subscription.status !== 'active') {
        res.status(403).json({ 
          error: 'Subscription is not active',
          status: req.user.subscription.status
        });
        return;
      }

      // Check if subscription has expired
      if (req.user.subscription.expiresAt && req.user.subscription.expiresAt < new Date()) {
        res.status(403).json({ 
          error: 'Subscription has expired',
          expiresAt: req.user.subscription.expiresAt
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Subscription middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};