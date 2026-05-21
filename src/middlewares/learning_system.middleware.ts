import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model';
import mongoose from 'mongoose';

// ─── Middleware: Validate ObjectId ───────────────────────────────────────────

/**
 * Validates a route param is a valid MongoDB ObjectId.
 * Usage: validateObjectId('milestoneId')
 */
export const validateObjectId =
  (paramName: string) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName] as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: `Invalid ${paramName}` });
      return;
    }
    next();
  };

// ─── Middleware: Require Language Selected ───────────────────────────────────

/**
 * Ensures the authenticated user has a selectedLanguage before
 * accessing any learning route that depends on it.
 */
export const requireLanguageSelected = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id).lean();
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    if (!user.selectedLanguage?.[0]) {
      res.status(400).json({ message: 'No language selected' });
      return;
    }
    next();
  } catch {
    res.status(500).json({ message: 'Internal server error' });
  }
};
