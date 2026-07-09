import { IAttack } from '../interfaces/game_system.interface';
import { Schema } from 'mongoose';
import mongoose from 'mongoose';

const attackSchema = new Schema<IAttack>(
  {
    attackerId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    targetId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    attackerName: { type: String, required: true },
    targetName: { type: String, required: true },
    targetCoinsBefore: { type: Number, required: true },
    targetCoinsAfter: { type: Number, required: true },
    attackerCoinsBefore: { type: Number, required: true },
    attackerCoinsAfter: { type: Number, required: true },
    coinsStolen: { type: Number, default: 100 },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Attack = mongoose.model<IAttack>('attack', attackSchema);
