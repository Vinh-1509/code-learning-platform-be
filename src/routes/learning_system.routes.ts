import { Router } from 'express';
import {
  getAllLanguages,
  getLanguageById,
  selectLanguage,
  getMilestones,
  getMilestoneById,
  getLessonsByMilestone,
  getLessonById,
} from '../controllers/learning_system.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  validateObjectId,
  requireLanguageSelected,
  requireLessonAccess,
} from '../middlewares/learning_system.middleware';

const router = Router();

// ─── Languages ───────────────────────────────────────────────────────────────

router.get('/languages', getAllLanguages);

router.get(
  '/languages/:languageId',
  validateObjectId('languageId'),
  getLanguageById,
);

router.post('/languages/select', authMiddleware, selectLanguage);

// ─── Learning ────────────────────────────────────────────────────────────────

router.get(
  '/learning/milestones',
  authMiddleware,
  requireLanguageSelected,
  getMilestones,
);

router.get(
  '/learning/milestones/:milestoneId',
  authMiddleware,
  validateObjectId('milestoneId'),
  getMilestoneById,
);

router.get(
  '/learning/milestones/:milestoneId/lessons',
  authMiddleware,
  validateObjectId('milestoneId'),
  requireLanguageSelected,
  getLessonsByMilestone,
);

router.get(
  '/learning/lessons/:lessonId',
  authMiddleware,
  validateObjectId('lessonId'),
  requireLessonAccess,
  getLessonById,
);

export default router;
