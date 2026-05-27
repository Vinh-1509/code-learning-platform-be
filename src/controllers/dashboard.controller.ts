import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

export const getDashboard = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.id; // from authenticate middleware
    const data = await DashboardService.getDashboard(userId);
    res.json(data);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load dashboard data',
    });
  }
};
