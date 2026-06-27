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
} from '../interfaces/auth.interface';
import { validateEmail, validatePassword } from '../utils/validators';

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

    const user = new User({
      email,
      password,
      username: username || email,
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
      createdAt: user.createdAt,
    };

    res.json(response);
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = (req: AuthRequest, res: Response): void => {
  res.json({ message: 'Logged out successfully' });
};
