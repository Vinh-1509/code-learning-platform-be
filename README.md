# CodeStep — Backend (code-learning-platform-be)

Backend for CodeStep, an AI-powered personalized learning platform designed to help beginners master **C++** and **Java** through conceptual understanding rather than rote memorization. The platform uses the **Feynman Technique** to validate learning: _"If you can explain it simply, you understand it."_

## Quick Links

- **Platform Overview**: See [docs/platform-overview.md](docs/platform-overview.md)
- **API Design**: See [docs/api-design.md](docs/api-design.md)
- **Database Design**: See [docs/database-design.md](docs/database-design.md)

---

## Table of Contents

1. [What is CodeStep?](#what-is-codestep)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Directory Structure](#directory-structure)
5. [Setup & Run](#setup--run)
6. [API Overview](#api-overview)
7. [Environment Variables](#environment-variables)

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
- **Hint System**: Progressive hints (Conceptual → Positional/Constraint)

### ✅ AI Error Explanation

When users submit incorrect answers:

- AI analyzes the specific error
- Provides targeted, clear explanation of what went wrong
- Helps learners understand the concept, not just fix the output

### ✅ AI Feynman Validation

After completing each exercise:

- Users must explain their reasoning to an AI "beginner" chatbot
- Example: _"Why use a for loop here instead of a while loop?"_
- Next block unlocks only when explanation is accepted
- Ensures conceptual understanding, not just memorization

### ✅ Adaptive Learning & Practice

- **Daily Question Page** (Nice to have): Spaced repetition system
  - Correct answers → interval doubles
  - Incorrect answers → interval halves
- **Dedicated Practice Page** (Critical): User-selected exercises
  - System tracks weakness tags across all activity
  - Recommends exercises based on weak areas

---

## Tech Stack

| Layer                | Technology                                  |
| -------------------- | ------------------------------------------- |
| **Runtime**          | Node.js (TypeScript)                        |
| **Framework**        | Express 4.19.2                              |
| **Database**         | MongoDB (Atlas M0 Free Tier, AWS Singapore) |
| **ORM/Schema**       | Mongoose 9.6.2                              |
| **Authentication**   | JWT (jsonwebtoken 9.0.3)                    |
| **Password Hashing** | bcryptjs 3.0.3                              |
| **Type Safety**      | TypeScript, Strict Mode                     |
| **Dev Tools**        | ts-node, nodemon, ESLint, Prettier, Husky   |

---

## Directory Structure

```text
code-learning-platform-be/
├── src/
│   ├── config/         # Configuration (env, database, external APIs)
│   ├── controllers/    # Business logic & request handlers
│   ├── interfaces/     # TypeScript types & request interfaces
│   ├── middleware/     # Express middlewares (auth, validation, etc.)
│   ├── models/         # Mongoose schemas & data models
│   ├── routes/         # API route definitions
│   ├── services/       # (Future) Business service layer
│   ├── integrations/   # (Future) External API integrations
│   └── index.ts        # Server entry point
├── docs/
│   ├── platform-overview.md    # Platform vision & features
│   ├── api-design.md           # Complete API specification
│   ├── database-design.md      # MongoDB schema design
│   └── milestones.md           # Project milestones & roadmap
├── dist/               # Compiled JavaScript (git-ignored)
├── tsconfig.json       # TypeScript configuration
├── package.json
├── .env                # Environment variables (git-ignored)
├── .env.example        # Template for .env
├── Dockerfile
└── README.md
```

### Directory Breakdown

| Directory | Purpose |
| --- | --- |
| **`config/`** | Database connection, environment setup, external API configs |
| **`controllers/`** | Request handlers, business logic, response formatting |
| **`interfaces/`** | TypeScript types, DTOs, request/response shapes |
| **`middleware/`** | Auth, validation, error handling, CORS |
| **`models/`** | Mongoose schemas, data validation |
| **`routes/`** | API endpoint definitions |
| **`services/`** | (Future) Reusable business logic across controllers |
| **`integrations/`** | (Future) OpenAI, email services, webhooks |

---

## Setup & Run

### Prerequisites

- **Node.js** (v16+) and **Yarn** (package manager)
- **MongoDB** connection string (Atlas or local)

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:

```env
PORT=3000
DB_STRING=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-key-here
REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=24h
REFRESH_EXPIRES_IN=7d
```

### 3. Run in Development

Hot-reload with automatic restart:

```bash
yarn dev
```

Server runs at `http://localhost:3000`

### 4. Build for Production

```bash
yarn build
```

Outputs compiled JavaScript to `dist/`

### 5. Run Production Build

```bash
yarn start
```

---

## API Overview

**Base URL**: `/api`

All endpoints (except auth) require:

```
Authorization: Bearer <access_token>
```

### Authentication Endpoints (PUBLIC)

| Method | Endpoint                    | Description                |
| ------ | --------------------------- | -------------------------- |
| `POST` | `/api/auth/register`        | Create new user account    |
| `POST` | `/api/auth/login`           | Login and get access token |
| `POST` | `/api/auth/refresh`         | Refresh access token       |
| `POST` | `/api/auth/forgot-password` | Request password reset     |
| `POST` | `/api/auth/reset-password`  | Reset password with token  |
| `POST` | `/api/auth/verify-email`    | Verify email address       |

### Protected Endpoints (REQUIRES AUTH)

| Method | Endpoint           | Description              |
| ------ | ------------------ | ------------------------ |
| `GET`  | `/api/auth/me`     | Get current user profile |
| `POST` | `/api/auth/logout` | Logout user              |

**Full API documentation**: See [docs/api-design.md](docs/api-design.md)

---

## Environment Variables

```env
# Server
PORT=3000

# Database
DB_STRING=<mongodb_connection_string>

# JWT
JWT_SECRET=<your_jwt_secret_key>
JWT_EXPIRES_IN=24h
REFRESH_SECRET=<your_refresh_secret>
REFRESH_EXPIRES_IN=7d

# (Future) External Services
OPENAI_API_KEY=<openai_key>
SENDGRID_API_KEY=<sendgrid_key>
```

---

## Development Scripts

```bash
# Development (with hot-reload)
yarn dev

# Type checking
yarn tsc

# Linting
yarn lint
yarn lint:fix

# Code formatting
yarn format

# Building
yarn build

# Production
yarn start
```

---

## Project Structure & Architecture

### Database

MongoDB with Mongoose for schema modeling and validation.

**Key Collections**:

- `users` — User accounts, authentication
- `verify` — Email verification tokens
- `refresh_tokens` — JWT refresh tokens with TTL
- `roadmaps` — Learning paths for each language
- `exercises` — Programming exercises with test cases
- `user_lesson_progress` — Track user's learning progress

See [docs/database-design.md](docs/database-design.md) for complete schema.

### Request Flow

```
Request → CORS/JSON Middleware → Route → Auth Middleware (if needed) → Controller → Service Layer → Database → Response
```

### Authentication Flow

1. User registers with email/password
2. Password hashed with bcryptjs
3. User logs in → JWT access token issued
4. Client sends token in `Authorization: Bearer <token>` header
5. `authMiddleware` verifies token, attaches user to request
6. Protected routes access `req.user.id` and `req.user.email`

---

## Code Quality

- **TypeScript**: Strict mode enabled for type safety
- **ESLint**: Enforces code style
- **Prettier**: Auto-formats code
- **Husky**: Pre-commit hooks run lint & format

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

The platform acts as the student, and the user acts as the teacher.

- **Unit Tests are just the start**: Passing test cases only proves your code _works_.
- **The Feynman Interview is the Gate**: After passing tests, users enter an AI-powered interview. They must explain their logic, line-by-line, to the AI. If the explanation is sound, the next concept is unlocked.

---

## 3. Target Audience

- **Absolute Beginners**: Individuals with zero coding experience who need a high-accountability, guided path.
- **Logic-Focused Students**: Developers looking to move beyond "coding by rote" toward deep architectural understanding.

---

## 4. Core Features

### A. Personalized Onboarding

- **Strategic Quiz**: Tailors the roadmap based on goals and current technical aptitude.
- **Environment Sync**: Guided setup for local IDEs (VS Code) to ensure bridge between web learning and professional tools.

### B. The Mastery Experience

- **Split-Screen IDE**: Integrated development environment paired with Theory Cards for seamless learning.
- **AI Feynman Interview**: The "Unlock" gate. Targeted questioning based on the user's specific implementation.

### C. Retention & Gamification

- **Dynamic Roadmap**: An interactive, visual map of the learning path where nodes unlock sequentially.
- **Spaced Repetition Widget**: Daily logic-based questions that adjust frequency based on performance.
- **Progression Systems**: Streaks, XP, and badges to maintain engagement.

---

## 5. The Learning Journey

```mermaid
graph TD
    Start((Onboarding)) --> Roadmap[Dynamic Roadmap]
    Roadmap --> Concept[Theory Card & IDE]
    Concept --> Tests[Pass Unit Tests]
    Tests --> Interview{AI Feynman Interview}
    Interview -- Logic Verified --> Unlock[Node Unlocked]
    Interview -- Logic Flaw --> Concept
    Unlock --> Next{Next Node?}
    Next -- Yes --> Roadmap
    Next -- No --> Done((Mastery Achieved))
```

---

## 6. Technical Architecture

| Component     | Technology                                  |
| :------------ | :------------------------------------------ |
| **Frontend**  | React 19, TypeScript, Vite, Tailwind CSS v4 |
| **Backend**   | ExpressJS (Node.js), TypeScript             |
| **Database**  | MongoDB (User data, Progress, Roadmap)      |
| **AI Engine** | OpenAI API (GPT-4o)                         |
| **Execution** | Specialized Code Execution API (C++/Java)   |

---

## 7. MVP Implementation Priority

1.  **Auth & Persistence**: Secure user login and progress tracking in MongoDB.
2.  **Split-Screen IDE**: Integration of a coding interface with a backend execution engine.
3.  **Feynman Interview Logic**: Prompt engineering the AI to act as a challenging but encouraging "interviewer."
4.  **Roadmap Visualization**: Building the interactive SVG/Canvas roadmap UI.

---
