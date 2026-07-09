import mongoose, { Schema } from 'mongoose';
import bcryptjs from 'bcryptjs';
import { IUser } from '../interfaces/auth.interface';

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    selectedLanguage: {
      type: [String],
      default: [],
    },
    coins: {
      type: Number,
      default: 0,
    },
    hasAttackSlot: {
      type: Boolean,
      default: false,
    },
    hasSeenTour: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false },
);

// Hash only new or changed passwords before persisting a user.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcryptjs.genSalt(10);
  this.password = await bcryptjs.hash(this.password, salt);
});

// Hide bcrypt details from auth controllers.
userSchema.methods.comparePassword = async function (
  password: string,
): Promise<boolean> {
  return bcryptjs.compare(password, this.password as string);
};

const User = mongoose.model<IUser>('User', userSchema);
export default User;
