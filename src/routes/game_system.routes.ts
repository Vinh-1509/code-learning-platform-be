import Router from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getTargets,
  attackTarget,
  getNotifications,
} from '../controllers/game_system.controller';

const router = Router();

router.get('/action/targets', authMiddleware, getTargets);
router.post('/action/attack', authMiddleware, attackTarget);
router.get('/users/notifications', authMiddleware, getNotifications);

export default router;
