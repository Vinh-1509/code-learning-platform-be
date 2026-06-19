import { Router } from 'express';
import { getTagInfo, getWeakTags } from '../controllers/tag.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateObjectId } from '../middlewares/learning_system.middleware';

const router = Router();

router.get('/tags/weakness', authMiddleware, getWeakTags);

router.get(
  '/tags/:tagId/info',
  authMiddleware,
  validateObjectId('tagId'),
  getTagInfo,
);

export default router;
