import 'dotenv/config';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not defined');
if (!process.env.REFRESH_SECRET)
  throw new Error('REFRESH_SECRET is not defined');
if (!process.env.DB_STRING) throw new Error('DB_STRING is not defined');

interface EnvConfig {
  PORT: string | number;
  MONGO_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REFRESH_SECRET: string;
  REFRESH_EXPIRES_IN: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL: string;
}

export const ENV: EnvConfig = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.DB_STRING,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  REFRESH_SECRET: process.env.REFRESH_SECRET,
  REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || '7d',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
};
