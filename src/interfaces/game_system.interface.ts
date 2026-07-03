import { Document } from 'mongoose';
import { Types } from 'mongoose';

export interface IAttack extends Document {
  attackerId: Types.ObjectId;
  targetId: Types.ObjectId;
  coinsStolen: number;
  isRead: boolean;
  createdAt: Date;
}
