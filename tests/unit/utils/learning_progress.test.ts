import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  buildDefaultBlockProgress,
  recalcLessonCompletion,
  isFirstMilestoneInRoadmap,
  averageMilestoneLessonCompletion,
  unlockNextMilestoneIfCompleted,
  getOrCreateLessonProgress,
} from '../../../src/utils/learning_progress';
import {
  Lesson,
  Milestone,
  UserLessonProgress,
  UserMilestoneProgress,
} from '../../../src/models/learning_system.model';

vi.mock('../../../src/models/learning_system.model', () => ({
  Lesson: {
    find: vi.fn(),
  },
  Milestone: {
    findOne: vi.fn(),
    findById: vi.fn(),
  },
  UserLessonProgress: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
  UserMilestoneProgress: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

describe('learning_progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildDefaultBlockProgress', () => {
    it('should return block progress with first active and rest locked', () => {
      const blockIds = [new Types.ObjectId(), new Types.ObjectId()];
      const result = buildDefaultBlockProgress(blockIds);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('active');
      expect(result[0].blockId).toBe(blockIds[0]);
      expect(result[1].status).toBe('locked');
      expect(result[1].blockId).toBe(blockIds[1]);
    });
  });

  describe('recalcLessonCompletion', () => {
    it('should return 0% if totalBlocks is 0', () => {
      const result = recalcLessonCompletion([], 0);
      expect(result.completionPercentage).toBe(0);
      expect(result.isCompleted).toBe(false);
    });

    it('should calculate percentage based on completed blocks', () => {
      const progress: any[] = [{ status: 'completed' }, { status: 'active' }];
      const result = recalcLessonCompletion(progress, 2);
      expect(result.completionPercentage).toBe(50);
      expect(result.isCompleted).toBe(false);
    });

    it('should return 100% and isCompleted true if all blocks completed', () => {
      const progress: any[] = [
        { status: 'completed' },
        { status: 'completed' },
      ];
      const result = recalcLessonCompletion(progress, 2);
      expect(result.completionPercentage).toBe(100);
      expect(result.isCompleted).toBe(true);
    });
  });

  describe('isFirstMilestoneInRoadmap', () => {
    it('should return true if milestone is the first one', async () => {
      const milestoneId = new Types.ObjectId();
      const roadmapId = new Types.ObjectId();

      const mockFindOne: any = {
        sort: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({ _id: milestoneId }),
      };
      (Milestone.findOne as any).mockReturnValue(mockFindOne);

      const result = await isFirstMilestoneInRoadmap(milestoneId, roadmapId);
      expect(result).toBe(true);
    });

    it('should return false if milestone is not the first one', async () => {
      const milestoneId = new Types.ObjectId();
      const firstId = new Types.ObjectId();
      const roadmapId = new Types.ObjectId();

      const mockFindOne: any = {
        sort: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({ _id: firstId }),
      };
      (Milestone.findOne as any).mockReturnValue(mockFindOne);

      const result = await isFirstMilestoneInRoadmap(milestoneId, roadmapId);
      expect(result).toBe(false);
    });
  });

  describe('averageMilestoneLessonCompletion', () => {
    it('should return 0 if no lessons found', async () => {
      const mockFind: any = {
        lean: vi.fn().mockResolvedValue([]),
      };
      (Lesson.find as any).mockReturnValue(mockFind);

      const result = await averageMilestoneLessonCompletion(
        'user1',
        new Types.ObjectId(),
      );
      expect(result).toBe(0);
    });

    it('should calculate average completion of lessons', async () => {
      const lesson1 = { _id: new Types.ObjectId() };
      const lesson2 = { _id: new Types.ObjectId() };

      (Lesson.find as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue([lesson1, lesson2]),
      });

      (UserLessonProgress.findOne as any).mockImplementation((query: any) => {
        return {
          lean: vi
            .fn()
            .mockResolvedValue(
              query.lessonId === lesson1._id
                ? { completionPercentage: 100 }
                : { completionPercentage: 50 },
            ),
        };
      });

      const result = await averageMilestoneLessonCompletion(
        'user1',
        new Types.ObjectId(),
      );
      expect(result).toBe(75);
    });
  });

  describe('unlockNextMilestoneIfCompleted', () => {
    it('should return early if current milestone is not completed', async () => {
      (UserMilestoneProgress.findOne as any).mockResolvedValue({
        status: 'active',
      });
      await unlockNextMilestoneIfCompleted('user1', new Types.ObjectId());
      expect(Milestone.findById).not.toHaveBeenCalled();
    });

    it('should unlock next milestone if it is locked', async () => {
      const milestoneId = new Types.ObjectId();
      const nextMilestoneId = new Types.ObjectId();

      (UserMilestoneProgress.findOne as any).mockImplementation(
        (query: any) => {
          if (query.milestoneId === milestoneId)
            return Promise.resolve({ status: 'completed' });
          if (query.milestoneId === nextMilestoneId) {
            return Promise.resolve({
              status: 'locked',
              save: vi.fn().mockResolvedValue(true),
            });
          }
          return Promise.resolve(null);
        },
      );

      (Milestone.findById as any).mockReturnValue({
        lean: vi
          .fn()
          .mockResolvedValue({ roadmapId: new Types.ObjectId(), order: 1 }),
      });

      (Milestone.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: nextMilestoneId }),
      });

      await unlockNextMilestoneIfCompleted('user1', milestoneId);
      expect(UserMilestoneProgress.findOne).toHaveBeenCalledTimes(2);
    });

    it('should create next milestone progress if not exists', async () => {
      const milestoneId = new Types.ObjectId();
      const nextMilestoneId = new Types.ObjectId();

      (UserMilestoneProgress.findOne as any).mockImplementation(
        (query: any) => {
          if (query.milestoneId === milestoneId)
            return Promise.resolve({ status: 'completed' });
          return Promise.resolve(null);
        },
      );

      (Milestone.findById as any).mockReturnValue({
        lean: vi
          .fn()
          .mockResolvedValue({ roadmapId: new Types.ObjectId(), order: 1 }),
      });

      (Milestone.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: nextMilestoneId }),
      });

      await unlockNextMilestoneIfCompleted('user1', milestoneId);
      expect(UserMilestoneProgress.create).toHaveBeenCalledWith(
        expect.objectContaining({
          milestoneId: nextMilestoneId,
          status: 'active',
        }),
      );
    });
  });

  describe('getOrCreateLessonProgress', () => {
    it('should create new progress if not found', async () => {
      (UserLessonProgress.findOne as any).mockResolvedValue(null);
      const mockCreated = { _id: 'new_id' };
      (UserLessonProgress.create as any).mockResolvedValue(mockCreated);

      const result = await getOrCreateLessonProgress(
        'user1',
        new Types.ObjectId(),
        [],
      );
      expect(result).toBe(mockCreated);
    });

    it('should backfill status if missing', async () => {
      const mockProgress: {
        isCompleted: boolean;
        status?: string;
        save: ReturnType<typeof vi.fn>;
      } = {
        isCompleted: true,
        status: undefined,
        save: vi.fn(),
      };
      (UserLessonProgress.findOne as any).mockResolvedValue(mockProgress);

      await getOrCreateLessonProgress('user1', new Types.ObjectId(), []);
      expect(mockProgress.status).toBe('completed');
      expect(mockProgress.save).toHaveBeenCalled();
    });

    it('should backfill blockProgress if missing', async () => {
      const mockProgress = {
        status: 'active',
        blockProgress: [],
        save: vi.fn(),
      };
      (UserLessonProgress.findOne as any).mockResolvedValue(mockProgress);

      await getOrCreateLessonProgress('user1', new Types.ObjectId(), [
        new Types.ObjectId(),
      ]);
      expect(mockProgress.blockProgress).toHaveLength(1);
      expect(mockProgress.save).toHaveBeenCalled();
    });
  });
});
