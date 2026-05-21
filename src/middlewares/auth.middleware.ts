import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { AuthRequest, JwtUser } from '../interfaces/auth.interface';

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET) as {
      userId: string;
      email: string;
    };

    const user: JwtUser = {
      id: decoded.userId,
      email: decoded.email,
    };
    req.user = user;

    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
