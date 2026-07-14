import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/auth.routes';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../setup/setupDB';

// ─── App ─────────────────────────────────────────────────────────────────────

// Build a minimal Express app with only auth routes.
// This avoids importing index.ts which triggers bootstrap() and auto-seeding.
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// ─── DB Lifecycle ─────────────────────────────────────────────────────────────

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validUser = {
  email: 'test@example.com',
  password: 'Password1!',
  username: 'testuser',
  fullName: 'Test User',
};

// register() always derives the username from the email prefix plus a random
// 4-digit suffix — it never persists the `username` field from the request
// body. Tests assert against that pattern instead of a literal value.
const GENERATED_USERNAME_PATTERN = /^test\d{4}$/;

async function registerUser(overrides = {}) {
  return request(app)
    .post('/api/auth/register')
    .send({ ...validUser, ...overrides });
}

async function loginUser(
  email = validUser.email,
  password = validUser.password,
) {
  return request(app).post('/api/auth/login').send({ email, password });
}

async function getValidToken(): Promise<string> {
  await registerUser();
  const res = await loginUser();
  return res.body.access_token as string;
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  describe('success', () => {
    it('returns 201 and a success message', async () => {
      const res = await registerUser();

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ message: 'User registered successfully' });
    });

    it('generates a username from the email prefix when username is omitted', async () => {
      await registerUser({ username: undefined });

      const token = (await loginUser()).body.access_token as string;
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.body.username).toMatch(GENERATED_USERNAME_PATTERN);
    });
  });

  describe('validation failures', () => {
    it('returns 400 when email is missing', async () => {
      const res = await registerUser({ email: undefined });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email and password are required');
    });

    it('returns 400 when password is missing', async () => {
      const res = await registerUser({ password: undefined });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email and password are required');
    });

    it('returns 400 for an invalid email format', async () => {
      const res = await registerUser({ email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid email format');
    });

    it('returns 400 when password is too short', async () => {
      const res = await registerUser({ password: 'Ab1!' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Password does not meet requirements');
      expect(res.body.errors).toContain(
        'Password must be at least 8 characters long',
      );
    });

    it('returns 400 when password has no uppercase letter', async () => {
      const res = await registerUser({ password: 'password1!' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toContain(
        'Password must contain at least one uppercase letter',
      );
    });

    it('returns 400 when password has no lowercase letter', async () => {
      const res = await registerUser({ password: 'PASSWORD1!' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toContain(
        'Password must contain at least one lowercase letter',
      );
    });

    it('returns 400 when password has no number', async () => {
      const res = await registerUser({ password: 'Password!' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toContain(
        'Password must contain at least one number',
      );
    });

    it('returns 400 when password has no special character', async () => {
      const res = await registerUser({ password: 'Password1' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toContain(
        'Password must contain at least one special character',
      );
    });
  });

  describe('conflict', () => {
    it('returns 409 when email is already registered', async () => {
      await registerUser();
      const res = await registerUser();

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Email already registered');
    });
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeAll(async () => await registerUser());

  describe('success', () => {
    it('returns 200 with an access_token', async () => {
      const res = await loginUser();

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token');
      expect(typeof res.body.access_token).toBe('string');
      expect(res.body.access_token.length).toBeGreaterThan(0);
    });
  });

  describe('validation failures', () => {
    it('returns 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: validUser.password });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email and password are required');
    });

    it('returns 400 when password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email and password are required');
    });
  });

  describe('authentication failures', () => {
    it('returns 401 when user does not exist', async () => {
      const res = await loginUser(
        'nonexistent@example.com',
        validUser.password,
      );

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Incorrect email or password');
    });

    it('returns 401 when password is wrong', async () => {
      const res = await loginUser(validUser.email, 'WrongPassword1!');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Incorrect email or password');
    });

    it('returns the same 401 message for wrong user and wrong password (no enumeration)', async () => {
      const noUser = await loginUser('ghost@example.com', validUser.password);
      const wrongPass = await loginUser(validUser.email, 'WrongPassword1!');

      expect(noUser.body.message).toBe(wrongPass.body.message);
    });
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  describe('success', () => {
    it('returns 200 with user data (no password field)', async () => {
      const token = await getValidToken();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(validUser.email);
      expect(res.body.fullName).toBe(validUser.fullName);
      // username is server-generated (email prefix + 4 random digits),
      // not the value the client sent in the register payload.
      expect(res.body.username).toMatch(GENERATED_USERNAME_PATTERN);
      expect(res.body).not.toHaveProperty('password');
    });

    it('includes _id and createdAt in the response', async () => {
      const token = await getValidToken();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('createdAt');
    });
  });

  describe('authentication failures', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('No token provided');
    });

    it('returns 401 for a malformed token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer this.is.invalid');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid token');
    });

    it('returns 401 when Authorization header has no Bearer prefix', async () => {
      const token = await getValidToken();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', token);

      expect(res.status).toBe(401);
    });
  });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('returns 200 with a success message when authenticated', async () => {
    const token = await getValidToken();
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(401);
  });
});
