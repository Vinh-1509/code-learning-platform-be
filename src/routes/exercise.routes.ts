import { Router } from 'express';
import { explainExerciseAnswer } from '../controllers/exercise.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateObjectId } from '../middlewares/learning_system.middleware';

const router = Router();

router.post(
  '/exercises/:exerciseId/explain',
  authMiddleware,
  validateObjectId('exerciseId'),
  explainExerciseAnswer,
);

export default router;
