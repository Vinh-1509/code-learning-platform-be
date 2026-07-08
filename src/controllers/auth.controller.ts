import { Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Types } from 'mongoose';
import User from '../models/user.model';
import { ENV } from '../config/env';
import {
  AuthRequest,
  RegisterPayload,
  LoginPayload,
  UserResponse,
  IUser,
} from '../interfaces/auth.interface';
import { validateEmail, validatePassword } from '../utils/validators';
import { UpdateMeRequest } from '../interfaces/auth.interface';

const jwtOptions: SignOptions = {
  expiresIn: ENV.JWT_EXPIRES_IN as SignOptions['expiresIn'],
};

export const register = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { email, password, username, fullName } = req.body as RegisterPayload;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    if (!validateEmail(email)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors,
      });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ message: 'Email already registered' });
      return;
    }

    let generatedUsername: string = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loop

    // Extract the part before @
    const emailPrefix = email.split('@')[0];

    while (!isUnique && attempts < maxAttempts) {
      // Generate random 4-digit number
      const randomNum = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0'); // 0-9999
      generatedUsername = `${emailPrefix}${randomNum}`;

      // Check if username already exists
      const usernameExists = await User.findOne({
        username: generatedUsername,
      });
      if (!usernameExists) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      // Fallback with more randomness if we couldn't find unique after max attempts
      const timestamp = Date.now().toString().slice(-6);
      generatedUsername = `${emailPrefix}${timestamp}`;
    }

    const user = new User({
      email,
      password,
      username: generatedUsername || username,
      fullName: fullName || '',
    });

    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginPayload;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Incorrect email or password' });
      return;
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Incorrect email or password' });
      return;
    }

    const userId =
      user._id instanceof Types.ObjectId
        ? user._id.toString()
        : String(user._id);
    const access_token = jwt.sign(
      { userId, email: user.email },
      ENV.JWT_SECRET,
      jwtOptions,
    );

    res.json({ access_token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const userId =
      user._id instanceof Types.ObjectId
        ? user._id.toString()
        : String(user._id);
    const response: UserResponse = {
      _id: userId,
      email: user.email,
      username: user.username || undefined,
      fullName: user.fullName || undefined,
      selectedLanguage: user.selectedLanguage || [],
      coins: user.coins,
      hasAttackSlot: user.hasAttackSlot,
      hasSeenTour: user.hasSeenTour,
      createdAt: user.createdAt,
    };

    res.json(response);
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateMe = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { username, fullName, hasSeenTour } = req.body as UpdateMeRequest;

    const update: Partial<IUser> = {};

    if (username !== undefined) {
      update.username = username.trim();
    }

    if (fullName !== undefined) {
      update.fullName = fullName.trim();
    }

    if (hasSeenTour !== undefined) {
      update.hasSeenTour = hasSeenTour;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: update,
      },
      {
        new: true,
        runValidators: true,
        select: '-password',
      },
    );

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const response: UserResponse = {
      _id: user._id.toString(),
      email: user.email,
      username: user.username || undefined,
      fullName: user.fullName || undefined,
      selectedLanguage: user.selectedLanguage || [],
      coins: user.coins,
      hasAttackSlot: user.hasAttackSlot,
      hasSeenTour: user.hasSeenTour,
      createdAt: user.createdAt,
    };

    res.json(response);
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
      res.status(409).json({
        message: 'Username already exists',
      });
      return;
    }

    console.error('UpdateMe error:', err);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
};

export const logout = (req: AuthRequest, res: Response): void => {
  res.json({ message: 'Logged out successfully' });
};
