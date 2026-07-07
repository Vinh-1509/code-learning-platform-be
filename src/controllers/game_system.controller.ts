import { Request, Response } from 'express';
import User from '../models/user.model';
import { Attack } from '../models/game_system.model';
import { AttackRequest } from '../types/game_system';
import mongoose from 'mongoose';

// api/action/targets
export const getTargets = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // First get current user's language
    const currentUser = await User.findById(currentUserId)
      .select('selectedLanguage')
      .lean();

    if (!currentUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Get 5 random users with same language, exclude current user
    const randomUsers = await User.aggregate([
      {
        $match: {
          _id: { $ne: currentUser._id },
          selectedLanguage: currentUser.selectedLanguage, // same language
          coins: { $gt: 0 }, // coins > 0
        },
      },
      { $sample: { size: 5 } }, // random selection
      {
        $project: {
          _id: 1,
          username: 1,
          coins: 1,
          selectedLanguage: 1,
        },
      },
    ]);

    res.json({
      language: currentUser.selectedLanguage,
      count: randomUsers.length,
      users: randomUsers,
    });
  } catch (error) {
    console.error('Error fetching random users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// api/action/attack
export const attackTarget = async (
  req: Request<unknown, unknown, AttackRequest>,
  res: Response,
) => {
  try {
    const attackerId = req.user?.id;
    const { targetId } = req.body;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      res.status(400).json({
        status: 'error',
        msg: 'Invalid target ID!',
      });
      return;
    }

    // Check if trying to attack self
    if (attackerId === targetId) {
      res.status(400).json({
        status: 'error',
        msg: 'Cannot attack yourself!',
      });
      return;
    }

    // Use findByIdAndUpdate for atomic operations
    const attacker = await User.findById(attackerId);

    if (!attacker) {
      return res.status(404).json({
        status: 'error',
        msg: 'User not found!',
      });
    }

    // Check attack slot
    if (!attacker.hasAttackSlot) {
      res.status(400).json({
        status: 'error',
        msg: 'No attack slots available',
        canAttack: false,
      });
      return;
    }

    // Check if target exists and has coins
    const target = await User.findById(targetId);

    if (!target) {
      res.status(404).json({
        status: 'error',
        msg: 'Target not found!',
      });
      return;
    }

    // Calculate coins to steal
    const COINS_TO_STEAL = 100;
    const coinsStolen = Math.min(COINS_TO_STEAL, target.coins);

    // Store balances before
    const targetCoinsBefore = target.coins;
    const attackerCoinsBefore = attacker.coins;

    // Perform updates
    const newTargetCoins = Math.max(0, target.coins - COINS_TO_STEAL);
    const newAttackerCoins = attacker.coins + coinsStolen;

    // Update both users atomically
    await Promise.all([
      User.findByIdAndUpdate(targetId, {
        $set: { coins: newTargetCoins },
      }),
      User.findByIdAndUpdate(attackerId, {
        $set: {
          coins: newAttackerCoins,
          hasAttackSlot: false,
        },
      }),
    ]);

    // Create attack record
    await Attack.create({
      attackerId: attacker._id,
      targetId: target._id,
      attackerName: attacker.username,
      targetName: target.username,
      coinsStolen: coinsStolen,
      targetCoinsBefore: targetCoinsBefore,
      targetCoinsAfter: newTargetCoins,
      attackerCoinsBefore: attackerCoinsBefore,
      attackerCoinsAfter: newAttackerCoins,
      isRead: false,
      createdAt: new Date(),
    });

    // Success response
    return res.status(200).json({
      status: 'success',
      msg:
        coinsStolen > 0
          ? 'Successfully bugged!'
          : 'Target has no coins left to steal!',
      newCoins: newAttackerCoins,
      details: {
        coinsStolen: coinsStolen,
        targetName: target.username,
        targetCoinsRemaining: newTargetCoins,
        attackerCoinsBefore: attackerCoinsBefore,
        attackerCoinsAfter: newAttackerCoins,
      },
    });
  } catch (error) {
    console.error('Attack error:', error);
    return res.status(500).json({
      status: 'error',
      msg: 'Internal server error',
      error:
        process.env.NODE_ENV === 'development'
          ? error instanceof Error
            ? error.message
            : 'Unknown error'
          : undefined,
    });
  }
};

// api/users/notifications
export async function getNotifications(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        message: 'User not authenticated',
      });
      return;
    }

    const attacks = await Attack.find({
      targetId: userId,
      isRead: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    const notifications = attacks.map((attack) => ({
      id: attack._id,
      type: 'attack',
      attackerName: attack.attackerName,
      coinsLost: attack.coinsStolen,
      message: `Your submission was bugged by ${attack.attackerName}! You lost ${attack.coinsStolen} CS-poin!`,
      createdAt: attack.createdAt,
    }));

    if (attacks.length > 0) {
      await Attack.updateMany(
        {
          _id: {
            $in: attacks.map((attack) => attack._id),
          },
        },
        {
          $set: {
            isRead: true,
          },
        },
      );
    }

    res.json({
      hasNotification: notifications.length > 0,
      notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

// Rank is 1-indexed: users with strictly more coins rank higher, and among
// users with equal coins the older account (smaller createdAt) ranks higher,
// matching the tie-break used by the topUsers sort below.
async function getUserRank(
  userId: string,
): Promise<{ rank: number; username?: string; coins: number } | null> {
  const user = await User.findById(userId)
    .select('username coins createdAt')
    .lean();

  if (!user) {
    return null;
  }

  const usersAhead = await User.countDocuments({
    $or: [
      { coins: { $gt: user.coins ?? 0 } },
      {
        coins: user.coins ?? 0,
        createdAt: { $lt: user.createdAt },
      },
    ],
  });

  return {
    rank: usersAhead + 1,
    username: user.username,
    coins: user.coins ?? 0,
  };
}

// api/users/leaderboard
export async function getLeaderboard(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const [me, topUsers, totalUsers, totalCoinsResult] = await Promise.all([
      getUserRank(currentUserId),

      User.find()
        .sort({
          coins: -1,
          createdAt: 1,
        })
        .limit(10)
        .select('username coins')
        .lean(),

      User.countDocuments(),

      User.aggregate<{ _id: null; totalCoins: number }>([
        {
          $group: {
            _id: null,
            totalCoins: {
              $sum: '$coins',
            },
          },
        },
      ]),
    ]);

    if (!me) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const leaderboard = topUsers.map((user, index) => ({
      ...user,
      coins: user.coins ?? 0,
      rank: index + 1,
    }));

    const totalCoins = totalCoinsResult[0]?.totalCoins ?? 0;

    res.json({
      me,
      totalUsers,
      totalCoins,
      topUsers: leaderboard,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}
