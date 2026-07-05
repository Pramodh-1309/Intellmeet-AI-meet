import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No authentication token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_intellmeet_token_2026');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access Denied: Unauthorized request.' });
    }
    const userRole = (req.user.role || '').toLowerCase().trim();
    const isAllowed = allowedRoles.some(r => r.toLowerCase().trim() === userRole);
    if (!isAllowed) {
      return res.status(403).json({ message: `Access Denied: Required role not met. Your role: "${req.user.role}"` });
    }
    next();
  };
};
