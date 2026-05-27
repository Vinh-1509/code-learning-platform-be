import { Router } from 'express';
import { authenticate } from '../middlewares/dashboard.middleware';
import { getDashboard } from '../controllers/dashboard.controller';

const router = Router();

// GET /api/dashboard
router.get('/', authenticate, getDashboard);

export default router;
