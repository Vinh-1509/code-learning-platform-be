import { Request, Response } from 'express';
import User from '../models/user.model';
import { Exercise } from '../models/exercise.model';
import { ExerciseAttempt } from '../models/exercise_attempt.model';
import {
  Lesson,
  Milestone,
  Roadmap,
  UserLessonProgress,
  UserMilestoneProgress,
} from '../models/learning_system.model';
import { UserTagStats } from '../models/user_tag_stats.model';
import type { DashboardResponse } from '../interfaces/dashboard.interface';
import type { ProgressStatus } from '../interfaces/learning_system.interface';

function authUserId(req: Request): string {
  return req.user!.id;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

// GET /api/dashboard
export const getDashboard = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = authUserId(req);
    const user = await User.findById(userId)
      .select('_id email username fullName selectedLanguage')
      .lean();

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const selectedLanguage = user.selectedLanguage ?? [];
    const language = selectedLanguage[0];
    if (!language) {
      res.status(400).json({ message: 'No language selected' });
      return;
    }

    const roadmap = await Roadmap.findOne({ language }).lean();
    if (!roadmap) {
      res
        .status(404)
        .json({ message: 'Roadmap not found for selected language' });
      return;
    }

    const milestones = await Milestone.find({ roadmapId: roadmap._id })
      .sort({ order: 1 })
      .lean();
    const milestoneIds = milestones.map((milestone) => milestone._id);

    const lessons = await Lesson.find({ milestoneId: { $in: milestoneIds } })
      .select('_id')
      .lean();
    const lessonIds = lessons.map((lesson) => lesson._id);

    const exercises = await Exercise.find({ lessonId: { $in: lessonIds } })
      .select('_id')
      .lean();
    const exerciseIds = exercises.map((exercise) => exercise._id);

    const [
      milestoneProgresses,
      learnedLessonsCount,
      totalCompletedExercises,
      weakTagsCount,
    ] = await Promise.all([
      UserMilestoneProgress.find({
        userId,
        milestoneId: { $in: milestoneIds },
      }).lean(),
      UserLessonProgress.countDocuments({
        userId,
        lessonId: { $in: lessonIds },
        $or: [{ isCompleted: true }, { status: 'completed' }],
      }),
      ExerciseAttempt.countDocuments({
        userId,
        exerciseId: { $in: exerciseIds },
        isPassed: true,
      }),
      UserTagStats.countDocuments({ userId, isWeak: true }),
    ]);

    const progressMap = new Map(
      milestoneProgresses.map((progress) => [
        progress.milestoneId.toString(),
        progress,
      ]),
    );
    const milestoneResponses = milestones.map((milestone, index) => {
      const progress = progressMap.get(milestone._id.toString());
      const fallbackStatus: ProgressStatus = index === 0 ? 'active' : 'locked';

      return {
        _id: milestone._id,
        title: milestone.title,
        status: progress?.status ?? fallbackStatus,
        completionPercentage: progress?.completionPercentage ?? 0,
      };
    });

    const response: DashboardResponse = {
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        selectedLanguage,
      },
      roadmap: {
        _id: roadmap._id,
        title: roadmap.title,
        language: roadmap.language,
      },
      stats: {
        totalLessons: lessons.length,
        totalLearnedLessons: learnedLessonsCount,
        totalExercises: exercises.length,
        totalCompletedExercises,
        overallProgress: average(
          milestoneResponses.map((milestone) => milestone.completionPercentage),
        ),
        weakTagsCount,
      },
      milestones: milestoneResponses,
      dailyReview: {
        pendingCount: 0,
      },
    };

    res.json(response);
  } catch (err) {
    console.error('Get dashboard error:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard' });
  }
};
