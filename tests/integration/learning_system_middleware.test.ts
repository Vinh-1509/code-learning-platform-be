import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateObjectId,
  requireLanguageSelected,
  requireLessonAccess,
  requireBlockAccess,
} from '../../src/middlewares/learning_system.middleware';
import User from '../../src/models/user.model';
import { Types } from 'mongoose';
import {
  UserMilestoneProgress,
  Milestone,
  Lesson,
  UserLessonProgress,
  Block,
} from '../../src/models/learning_system.model';
import * as learningProgressUtils from '../../src/utils/learning_progress';

vi.mock('../../src/models/user.model');
vi.mock('../../src/models/learning_system.model');
vi.mock('../../src/utils/learning_progress');

describe('learning_system.middleware', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = { params: {}, user: { id: new Types.ObjectId().toString() } };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('validateObjectId', () => {
    it('should call next if id is valid', () => {
      req.params.id = new Types.ObjectId().toString();
      validateObjectId('id')(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 if id is invalid', () => {
      req.params.id = 'invalid-id';
      validateObjectId('id')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid id' });
    });
  });

  describe('requireLanguageSelected', () => {
    it('should return 404 if user not found', async () => {
      (User.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });
      await requireLanguageSelected(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if language not selected', async () => {
      (User.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ selectedLanguage: [] }),
      });
      await requireLanguageSelected(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next if language is selected', async () => {
      (User.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ selectedLanguage: ['C++'] }),
      });
      await requireLanguageSelected(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireLessonAccess', () => {
    it('should return 404 if lesson not found', async () => {
      req.params.lessonId = new Types.ObjectId().toString();
      (Lesson.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });
      await requireLessonAccess(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should call next if access is allowed (first lesson, first milestone)', async () => {
      req.params.lessonId = new Types.ObjectId().toString();
      const milestoneId = new Types.ObjectId().toString();

      (Lesson.findById as any).mockReturnValue({
        lean: vi
          .fn()
          .mockResolvedValue({ _id: req.params.lessonId, milestoneId }),
      });

      (UserMilestoneProgress.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ status: 'active' }),
      });

      (Lesson.find as any).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ _id: req.params.lessonId }]),
      });

      await requireLessonAccess(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if milestone locked', async () => {
      req.params.lessonId = new Types.ObjectId().toString();
      const milestoneId = new Types.ObjectId().toString();

      (Lesson.findById as any).mockReturnValue({
        lean: vi
          .fn()
          .mockResolvedValue({ _id: req.params.lessonId, milestoneId }),
      });

      (UserMilestoneProgress.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ status: 'locked' }),
      });

      await requireLessonAccess(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Forbidden: Milestone is locked',
      });
    });
  });

  describe('requireBlockAccess', () => {
    it('should return 404 if block not found', async () => {
      req.params.blockId = new Types.ObjectId().toString();
      (Block.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });
      await requireBlockAccess(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 if lesson not found', async () => {
      req.params.blockId = new Types.ObjectId().toString();
      (Block.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ lessonId: new Types.ObjectId() }),
      });
      (Lesson.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });
      await requireBlockAccess(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should call next if block access is allowed', async () => {
      req.params.blockId = new Types.ObjectId().toString();
      const lessonId = new Types.ObjectId().toString();
      const milestoneId = new Types.ObjectId().toString();

      (Block.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ lessonId }),
      });
      (Lesson.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: lessonId, milestoneId }),
      });
      (UserMilestoneProgress.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ status: 'active' }),
      });
      (Lesson.find as any).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ _id: lessonId }]),
      });

      await requireBlockAccess(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if milestone is locked', async () => {
      req.params.blockId = new Types.ObjectId().toString();
      const lessonId = new Types.ObjectId().toString();
      const milestoneId = new Types.ObjectId().toString();

      (Block.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ lessonId }),
      });
      (Lesson.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: lessonId, milestoneId }),
      });
      (UserMilestoneProgress.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ status: 'locked' }),
      });

      await requireBlockAccess(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
