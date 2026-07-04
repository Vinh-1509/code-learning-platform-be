import { IAttack } from '../interfaces/game_system.interface';
import { Schema } from 'mongoose';
import mongoose from 'mongoose';

const attackSchema = new Schema<IAttack>(
  {
    attackerId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    targetId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    coinsStolen: { type: Number, default: 100 },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Attack = mongoose.model<IAttack>('attack', attackSchema);
