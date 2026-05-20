import 'dotenv/config';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not defined');
if (!process.env.REFRESH_SECRET)
  throw new Error('REFRESH_SECRET is not defined');
if (!process.env.DB_STRING) throw new Error('DB_STRING is not defined');

export const ENV = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.DB_STRING,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  REFRESH_SECRET: process.env.REFRESH_SECRET,
  REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || '7d',
};
