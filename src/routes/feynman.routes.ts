import { Router } from 'express';
import {
  getBlockFeynmanHistory,
  getBlockFeynmanQuestion,
  getBlockFeynmanStats,
  postBlockFeynmanChat,
} from '../controllers/feynman.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateObjectId } from '../middlewares/learning_system.middleware';

const router = Router();

router.get(
  '/feynman/block/:blockId/question',
  authMiddleware,
  validateObjectId('blockId'),
  getBlockFeynmanQuestion,
);

router.post(
  '/feynman/block/:blockId/chat',
  authMiddleware,
  validateObjectId('blockId'),
  postBlockFeynmanChat,
);

router.get(
  '/feynman/block/:blockId/history',
  authMiddleware,
  validateObjectId('blockId'),
  getBlockFeynmanHistory,
);

router.get(
  '/feynman/block/:blockId/stats',
  authMiddleware,
  validateObjectId('blockId'),
  getBlockFeynmanStats,
);

export default router;
