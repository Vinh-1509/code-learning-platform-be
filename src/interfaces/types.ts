import { Request } from 'express';
import { Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
  selectedLanguage?: string[];
  createdAt: Date;
  updatedAt: Date;

  comparePassword(password: string): Promise<boolean>;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

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
  updatedAt: Date;
}
