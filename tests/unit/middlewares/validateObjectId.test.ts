import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { validateObjectId } from '../../../src/middlewares/learning_system.middleware';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildMocks(paramName: string, paramValue: string) {
  const req = {
    params: { [paramName]: paramValue },
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('validateObjectId middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Valid IDs ──────────────────────────────────────────────────────────────

  describe('when the param is a valid ObjectId', () => {
    it('calls next() and does not touch res', () => {
      const validId = '507f1f77bcf86cd799439011';
      const { req, res, next } = buildMocks('milestoneId', validId);

      validateObjectId('milestoneId')(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('works for any param name', () => {
      const validId = '507f191e810c19729de860ea';
      const { req, res, next } = buildMocks('blockId', validId);

      validateObjectId('blockId')(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ── Invalid IDs ────────────────────────────────────────────────────────────

  describe('when the param is not a valid ObjectId', () => {
    it('returns 400 with the correct message for a random string', () => {
      const { req, res, next } = buildMocks('milestoneId', 'not-an-id');

      validateObjectId('milestoneId')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid milestoneId' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 for an empty string', () => {
      const { req, res, next } = buildMocks('lessonId', '');

      validateObjectId('lessonId')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid lessonId' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 for an ObjectId that is too short', () => {
      const { req, res, next } = buildMocks(
        'blockId',
        '507f1f77bcf86cd7994390',
      );

      validateObjectId('blockId')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid blockId' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 for a numeric string', () => {
      const { req, res, next } = buildMocks('exerciseId', '12345');

      validateObjectId('exerciseId')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid exerciseId' });
      expect(next).not.toHaveBeenCalled();
    });

    it('includes the correct param name in the error message', () => {
      const paramName = 'languageId';
      const { req, res, next } = buildMocks(paramName, 'bad-value');

      validateObjectId(paramName)(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        message: `Invalid ${paramName}`,
      });
    });
  });

  // ── Middleware factory ─────────────────────────────────────────────────────

  describe('middleware factory', () => {
    it('returns a function when called', () => {
      const middleware = validateObjectId('milestoneId');
      expect(typeof middleware).toBe('function');
    });

    it('two instances with different param names act independently', () => {
      const validId = '507f1f77bcf86cd799439011';
      const invalidId = 'bad';

      const {
        req: req1,
        res: res1,
        next: next1,
      } = buildMocks('milestoneId', validId);
      const {
        req: req2,
        res: res2,
        next: next2,
      } = buildMocks('blockId', invalidId);

      validateObjectId('milestoneId')(req1, res1, next1);
      validateObjectId('blockId')(req2, res2, next2);

      expect(next1).toHaveBeenCalledOnce();
      expect(next2).not.toHaveBeenCalled();
      expect(res2.status).toHaveBeenCalledWith(400);
    });
  });
});
