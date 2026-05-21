import { Request } from 'express';
import { Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
  selectedLanguage?: string[];
  createdAt: Date;

  comparePassword(password: string): Promise<boolean>;
}

/** Payload attached to req.user after JWT verification in authMiddleware */
export interface JwtUser {
  id: string;
  email: string;
}

/** Semantic alias: route expects authMiddleware; shape comes from express.d.ts augmentation */
export type AuthRequest = Request;

export interface RegisterPayload {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  message?: string;
  access_token?: string;
}

export interface UserResponse {
  _id: string;
  email: string;
  username?: string;
  fullName?: string;
  selectedLanguage?: string[];
  createdAt: Date;
}
