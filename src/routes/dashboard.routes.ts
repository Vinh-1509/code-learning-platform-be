import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireLanguageSelected } from '../middlewares/learning_system.middleware';

const router = Router();

router.get('/dashboard', authMiddleware, requireLanguageSelected, getDashboard);

export default router;
