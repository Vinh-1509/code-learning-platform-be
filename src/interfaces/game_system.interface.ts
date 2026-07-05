import { Document } from 'mongoose';
import { Types } from 'mongoose';

export interface IAttack extends Document {
  attackerId: Types.ObjectId;
  targetId: Types.ObjectId;
  attackerName: string;
  targetName: string;
  coinsStolen: number;
  targetCoinsBefore: number;
  targetCoinsAfter: number;
  attackerCoinsBefore: number;
  attackerCoinsAfter: number;
  isRead: boolean; // target has read this (for notifications)
  createdAt: Date;
}

export interface rewardResponse {
  prizeType: 'coin' | 'attack' | 'no prize';
  amount: number;
  currentCoin: number;
  hasAttackSlot: boolean;
}
