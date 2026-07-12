# CodeStep — Backend (code-learning-platform-be)

Backend for CodeStep, an AI-powered personalized learning platform designed to help beginners master **C++** and **Java** through conceptual understanding rather than rote memorization. The platform uses the **Feynman Technique** to validate learning: _"If you can explain it simply, you understand it."_

## Quick Links

- **Live API**: [https://code-learning-platform-be.onrender.com](https://code-learning-platform-be.onrender.com) (`GET /` returns `{"message":"CodeStep BE is running"}`)
- **Platform Overview**: See [docs/platform-overview.md](docs/platform-overview.md)
- **API Design**: See [docs/api-design.md](docs/api-design.md)
- **Database Design**: See [docs/database-design.md](docs/database-design.md)

> Hosted on Render's free tier — the instance spins down after periods of inactivity, so the first request after a while may take 30–60s to respond while it cold-starts.

---

## Table of Contents

1. [What is CodeStep?](#what-is-codestep)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Directory Structure](#directory-structure)
5. [Setup & Run](#setup--run)
6. [API Overview](#api-overview)
7. [Environment Variables](#environment-variables)
8. [Testing](#testing)
9. [Team](#team)

---

## What is CodeStep?

CodeStep is an AI-powered **personalized learning platform** for programming beginners. The platform's philosophy is:

> **"Learning how to think" before "Learning how to code."**

### Target Users

- **Beginners** — no prior programming experience
- **Students with weak foundations** — need to rebuild core programming thinking
- Learners who understand syntax but struggle with logic and problem-solving

### Supported Languages

- **C++** — Build strong foundations in low-level programming
- **Java** — Object-oriented programming and design patterns

---

## Features

### ✅ Block-based Learning System

A split-screen interface delivering curriculum through sequential **Learning Blocks**:

- **Left pane**: Theory, sample code, code flow visualizations (Markdown-rendered)
- **Right pane**: Interactive tasks (drag-and-drop, fill-in-the-blank)
- **Progression**: Locked → Active → Completed (auto-unlocks after completion)
- **Hint System**: Progressive, per-exercise hints tracked per user

### ✅ AI Error Explanation

When users submit incorrect answers on a practice exercise (`POST /api/exercises/:exerciseId/explain`):

- The backend grades the answer first (source of truth), then asks the AI to explain it
- AI analyzes the specific error and provides a targeted, encouraging explanation
- Primary provider is **Google Gemini**, with an automatic fallback to **Groq** if Gemini fails or returns invalid output

### ✅ AI Feynman Validation

After completing a block's required exercises, users must explain their reasoning to an AI "beginner" chatbot (`/api/feynman/block/:blockId/*`):

- The next block unlocks only once the AI accepts the explanation (`isFeynmanPassed: true`)
- Failed attempts get one short follow-up question; repeated failures trigger a temporary cooldown
- Powered by **Groq**

### ✅ Weakness Tracking & Practice

- Every exercise submission updates per-tag statistics (`user_tag_stats`): total attempts, failures, and a computed `isWeak` flag
- `GET /api/tags/weakness` and `GET /api/tags/:tagId/info` surface weak areas for a dedicated Practice page
- `GET /api/practice/exercises` supports search, filtering (language, difficulty, tag, status), and pagination

### ✅ Gamification — Attacks & Leaderboard

- `GET /api/action/targets` — pick random opponents who share your selected language
- `POST /api/action/attack` — spend an attack slot to steal coins from a target
- `GET /api/users/notifications` — unread "you got attacked" notifications
- `GET /api/users/leaderboard` — top 10 users by coins, plus the caller's own rank

### 🚧 Not Yet Implemented

- **Spaced Repetition / Daily Review** — documented in `docs/api-design.md` (`/api/repetition/*`) but not currently wired up; `dailyReview.pendingCount` on the dashboard always returns `0`.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Runtime** | Node.js (TypeScript) |
| **Framework** | Express 5 |
| **Database** | MongoDB (Atlas M0 Free Tier, AWS Singapore) |
| **ORM/Schema** | Mongoose |
| **Authentication** | JWT (`jsonwebtoken`) |
| **Password Hashing** | bcryptjs |
| **AI — Error Explanation** | Google Gemini (primary), Groq (fallback) |
| **AI — Feynman Interview & Question Generation** | Groq |
| **Type Safety** | TypeScript, Strict Mode |
| **Testing** | Vitest, Supertest, mongodb-memory-server |
| **Dev Tools** | ts-node, nodemon, ESLint, Prettier, Husky, lint-staged |

---

## Directory Structure

```text
code-learning-platform-be/
├── src/
│   ├── config/          # Environment loading (env.ts) and MongoDB connection (mongodb.ts)
│   ├── controllers/     # Request handlers & business logic
│   ├── interfaces/      # TypeScript types, DTOs, request/response shapes
│   ├── middlewares/     # authMiddleware, learning-system access guards, validateObjectId
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express route definitions
│   ├── services/        # AI integrations (Gemini/Groq explanation, Feynman, question generation)
│   ├── types/           # Express request augmentation, shared request types
│   ├── utils/           # Pure helpers (grading, tag stats, learning-progress calculations, validators)
│   ├── app.ts           # Express app assembly (middleware + route mounting)
│   ├── index.ts         # Server bootstrap (DB connect, auto-seed if empty, listen)
│   └── seed.ts          # Seeds roadmaps/milestones/lessons/blocks/exercises for C++ and Java
├── tests/
│   ├── setup/           # Test env vars & in-memory MongoDB lifecycle helpers
│   ├── unit/             # Utils, services, middlewares in isolation
│   ├── integration/      # Controllers + models via routes, using mongodb-memory-server
│   └── api/               # HTTP contract tests (status codes, error shapes) via supertest
├── docs/
│   ├── platform-overview.md    # Platform vision & features
│   ├── api-design.md           # Complete API specification
│   ├── database-design.md      # MongoDB schema design
│   └── milestones.md           # Project milestones & timeline
├── dist/                # Compiled JavaScript (git-ignored)
├── tsconfig.json / tsconfig.build.json / tsconfig.test.json
├── vitest.config.ts
├── package.json
├── .env                 # Environment variables (git-ignored)
└── README.md
```

### Directory Breakdown

| Directory | Purpose |
| --- | --- |
| **`config/`** | Database connection and environment variable loading/validation |
| **`controllers/`** | Request handlers, business logic, response formatting |
| **`interfaces/`** | TypeScript types, DTOs, request/response shapes |
| **`middlewares/`** | Auth, ObjectId validation, learning-system access rules |
| **`models/`** | Mongoose schemas, data validation |
| **`routes/`** | API endpoint definitions |
| **`services/`** | AI integrations (exercise explanation, Feynman feedback, question generation) |
| **`utils/`** | Reusable pure logic shared across controllers (grading, tag stats, progress math) |

---

## Setup & Run

### Prerequisites

- **Node.js** (v18+) and **Yarn** (package manager — enforced by a `preinstall` check)
- **MongoDB** connection string (Atlas or local)

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure Environment

Create a `.env` file at the project root (see [Environment Variables](#environment-variables) below for the full list).

### 3. Run in Development

Hot-reload with automatic restart:

```bash
yarn dev
```

Server runs at `http://localhost:3000` (or `PORT` if set). On first boot, if the `roadmaps` collection is empty, the server automatically seeds C++ and Java learning content.

### 4. Seed Manually (optional)

```bash
yarn seed
```

Clears and re-seeds all learning-content collections (roadmaps, milestones, lessons, blocks, exercises, tags, language info).

### 5. Build for Production

```bash
yarn build
```

Outputs compiled JavaScript to `dist/`.

### 6. Run Production Build

```bash
yarn start
```

---

## API Overview

**Base URL**: `/api`

All endpoints except registration/login/language listing require:

```
Authorization: Bearer <access_token>
```

| Area | Base path | Notes |
| --- | --- | --- |
| Authentication | `/api/auth/*` | register, login, logout, `me` (get/update) |
| Learning System | `/api/languages`, `/api/learning/*` | languages, milestones, lessons, blocks |
| Practice System | `/api/practice/exercises*` | list/filter, detail, submit, hint, history |
| AI Feynman | `/api/feynman/block/:blockId/*` | question, chat, history, reset, stats |
| Tag Stats | `/api/tags/*` | weakness list, per-tag info |
| Dashboard | `/api/dashboard` | aggregated user summary |
| AI Error Explanation | `/api/exercises/:exerciseId/explain` | graded answer + AI explanation |
| Gamification | `/api/action/*`, `/api/users/notifications`, `/api/users/leaderboard` | attack/target/leaderboard system |

**Full, field-by-field API documentation with request/response examples**: See [docs/api-design.md](docs/api-design.md)

---

## Environment Variables

```env
# Server
PORT=3000

# Database
DB_STRING=mongodb+srv://username:DB_PASSWORD@cluster.mongodb.net/database?retryWrites=true&w=majority
DB_PASSWORD=<your_db_password>   # optional: substituted into DB_STRING's "DB_PASSWORD" placeholder if present

# JWT
JWT_SECRET=<your_jwt_secret_key>
JWT_EXPIRES_IN=7d
REFRESH_SECRET=<your_refresh_secret>
REFRESH_EXPIRES_IN=7d

# AI — Google Gemini (primary for exercise explanations)
GEMINI_API_KEY=<gemini_api_key>
GEMINI_MODEL=gemini-2.5-flash   # default if unset

# AI — Groq (fallback for explanations; primary for Feynman chat & question generation)
GROQ_API_KEY=<groq_api_key>
GROQ_MODEL=llama-3.1-8b-instant   # default if unset
```

> `JWT_SECRET`, `REFRESH_SECRET`, and `DB_STRING` are required — the app throws on startup if any is missing. AI keys are optional at startup but required for the corresponding AI features to function (missing keys throw at call time, which the controllers catch and fall back gracefully where possible).

---

## Testing

```bash
# Watch mode
yarn test

# Single run
yarn test:run

# With coverage (v8 provider)
yarn test:coverage
```

Tests use **Vitest**, **Supertest** for HTTP-level contract tests, and **mongodb-memory-server** for an ephemeral database per suite — no external MongoDB instance is needed to run the test suite. Coverage is collected over `src/services`, `src/utils`, `src/middlewares`, and `src/controllers`.

---

## Development Scripts

```bash
yarn dev             # Development server with hot-reload
yarn build           # Type-check and compile to dist/
yarn start           # Run the compiled production build
yarn seed            # Re-seed learning content
yarn lint            # Lint
yarn lint:fix         # Lint and auto-fix
yarn format           # Prettier formatting
yarn test             # Vitest watch mode
yarn test:run         # Vitest single run
yarn test:coverage    # Vitest with coverage report
```

A pre-commit hook (Husky + lint-staged) runs ESLint and Prettier on staged files automatically.

---

## Project Structure & Architecture

### Database

MongoDB with Mongoose for schema modeling and validation.

**Key Collections**:

- `users` — user accounts, coins, attack slots, selected language
- `roadmaps` / `milestone` / `lessons` / `blocks` — learning content hierarchy
- `user_milestone_progress` / `user_lesson_progress` — per-user progress, including block-level Feynman chat state
- `exercises` / `exercise_tag` / `exercise_attempt` / `user_tag_stats` — practice exercises, tagging, submissions, and weakness aggregation
- `language_info` — static descriptive content per supported language
- `attack` — records of the coin-stealing gamification feature

See [docs/database-design.md](docs/database-design.md) for the complete schema.

### Request Flow

```
Request → CORS/JSON Middleware → Route → Auth Middleware (if needed) → Controller → Models/Services → Database → Response
```

### Authentication Flow

1. User registers with email/password (password hashed with bcryptjs; username auto-generated if omitted)
2. User logs in → JWT access token issued (`JWT_SECRET`, expires per `JWT_EXPIRES_IN`)
3. Client sends the token in `Authorization: Bearer <token>`
4. `authMiddleware` verifies the token and attaches `{ id, email }` to `req.user`
5. Protected routes read `req.user.id` / `req.user.email`

---

## Code Quality

- **TypeScript**: Strict mode enabled for type safety
- **ESLint**: Enforces code style, including `no-floating-promises`, `no-explicit-any`, and unsafe-access rules on `src/**` (relaxed for test files)
- **Prettier**: Auto-formats code
- **Husky + lint-staged**: Pre-commit hooks run lint and format on staged files
- **CI**: GitHub Actions runs lint, type-check (`build`), and `test:coverage` on every push/PR to `main`/`develop`

Run manually:

```bash
yarn lint:fix
yarn format
```

---

## Team

- **Vinh Luong**
- **Minh**
- **An**
- **Quan**
- **Vinh Vu**

---

## License

Private project. See organization for license details.
