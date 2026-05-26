import { Router } from 'express';
import {
  getPracticeExerciseById,
  getPracticeExerciseHistory,
  getPracticeExercises,
  requestPracticeHint,
  submitPracticeExercise,
} from '../controllers/practice.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateObjectId } from '../middlewares/learning_system.middleware';

const router = Router();

router.get('/practice/exercises', authMiddleware, getPracticeExercises);
router.get(
  '/practice/exercises/:exerciseId',
  authMiddleware,
  validateObjectId('exerciseId'),
  getPracticeExerciseById,
);
router.post(
  '/practice/exercises/:exerciseId/submit',
  authMiddleware,
  validateObjectId('exerciseId'),
  submitPracticeExercise,
);
router.post(
  '/practice/exercises/:exerciseId/hint',
  authMiddleware,
  validateObjectId('exerciseId'),
  requestPracticeHint,
);
router.get(
  '/practice/exercises/:exerciseId/history',
  authMiddleware,
  validateObjectId('exerciseId'),
  getPracticeExerciseHistory,
);

export default router;
