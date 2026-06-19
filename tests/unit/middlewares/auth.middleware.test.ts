import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authMiddleware } from '../../../src/middlewares/auth.middleware';
import jwt from 'jsonwebtoken';
import { ENV } from '../../../src/config/env';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

describe('auth.middleware', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('should return 401 if no token provided', () => {
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if invalid token', () => {
    req.headers.authorization = 'Bearer invalidtoken';
    (jwt.verify as any).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next and set req.user if token is valid', () => {
    req.headers.authorization = 'Bearer validtoken';
    const decodedPayload = { userId: '123', email: 'test@example.com' };
    (jwt.verify as any).mockReturnValue(decodedPayload);

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('validtoken', ENV.JWT_SECRET);
    expect(req.user).toEqual({ id: '123', email: 'test@example.com' });
    expect(next).toHaveBeenCalled();
  });
});
