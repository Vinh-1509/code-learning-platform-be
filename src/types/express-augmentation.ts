import type { JwtUser } from '../interfaces/auth.interface';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtUser;
  }
}

export {};
