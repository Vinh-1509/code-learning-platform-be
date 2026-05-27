import { Types } from 'mongoose';
import { IUser } from '../interfaces/auth.interface';
import User from '../models/user.model';
import { Roadmap } from '../models/learning_system.model';
import { UserMilestoneProgress } from '../models/learning_system.model';
import { UserLessonProgress } from '../models/learning_system.model';
import { Exercise } from '../models/exercise.model';
import {
  IDashboardResponse,
  DashboardRoadmap,
} from '../interfaces/dashboard.interface';

export class DashboardService {
  static async getDashboard(userId: string): Promise<IDashboardResponse> {
    // 1. User data (only needed fields)
    const user = await User.findById(userId)
      .select('_id username selectedLanguage')
      .lean<Pick<IUser, '_id' | 'username' | 'selectedLanguage'>>();

    if (!user) throw new Error('User not found');

    // 2. Active roadmap
    const rawRoadmap = await Roadmap.findOne({ userId })
      .select('_id language title')
      .lean<{ _id: Types.ObjectId; language: string; title: string }>();
    const roadmap: DashboardRoadmap = rawRoadmap
      ? {
          _id: rawRoadmap._id.toString(),
          title: rawRoadmap.title,
          language: rawRoadmap.language,
        }
      : { _id: '', language: '', title: '' };

    // 3. Statistics
    const [learnedLessons, completedExercises] = await Promise.all([
      UserLessonProgress.countDocuments({ userId, isCompleted: true }),
      Exercise.countDocuments({ userId, status: 'completed' }),
    ]);

    const totalLessons = await UserLessonProgress.countDocuments({ userId });
    const overallProgress =
      totalLessons > 0 ? Math.round((learnedLessons / totalLessons) * 100) : 0;

    // 4. Milestones with progress
    const rawMilestones = await UserMilestoneProgress.find({ userId })
      .select('milestoneId status completionPercentage') // fields from progress doc
      .populate('milestoneId', 'title') // fetch title from Milestone
      .lean<
        Array<{
          _id: Types.ObjectId;
          milestoneId: { _id: Types.ObjectId; title: string }; // populated doc
          status: 'Locked' | 'Active' | 'Completed';
          completionPercentage: number;
        }>
      >();

    const milestones = rawMilestones.map((m) => ({
      _id: m.milestoneId._id.toString(), // use the milestone's _id (more useful)
      title: m.milestoneId.title,
      status: m.status,
      completionPercentage: m.completionPercentage,
    }));

    // 5. Daily review pending count
    // TODO: Implement when pending review is implemented

    return {
      user: {
        _id: user._id,
        username: user.username,
        selectedLanguage: user.selectedLanguage,
      },
      roadmap: roadmap || { _id: '', language: '', title: '' },
      stats: {
        totalLearnedLessons: learnedLessons,
        totalCompletedExercises: completedExercises,
        overallProgress,
        weakTagsCount: 0, // placeholder until implemented
      },
      milestones,
      dailyReview: { pendingCount: 0 }, // placeholder
    };
  }

  // private static async getWeakTagsCount(userId: string): Promise<number> {
  // // TODO: implement
  //   return 0;
  // }
}
