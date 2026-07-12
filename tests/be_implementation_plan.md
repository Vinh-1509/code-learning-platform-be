# Testing Implementation Plan — `code-learning-platform-be`

This document outlines the analysis of the `code-learning-platform-be` backend codebase and the testing strategy implemented against it.

---

## 1. Tech Stack Summary

Based on `package.json` and the `src/` directory, the backend relies on:

- **Runtime**: Node.js
- **Framework**: Express 5
- **Language**: TypeScript
- **Database**: MongoDB
- **ORM/ODM**: Mongoose
- **Authentication**: JWT (`jsonwebtoken`) & `bcryptjs`
- **External Integrations**: Google Gemini AI (via raw `fetch` to the REST endpoint), Groq (primary for Feynman chat and question generation; fallback for AI explanation when Gemini fails)

---

## 2. Testing Stack (Installed)

All dependencies have been installed via `yarn`:

| Package                 | Purpose                                       |
| ----------------------- | --------------------------------------------- |
| `vitest`                | Test runner (native TypeScript + ESM support) |
| `@vitest/coverage-v8`   | Code coverage via V8                          |
| `supertest`             | HTTP integration testing against Express app  |
| `@types/supertest`      | TypeScript types for supertest                |
| `mongodb-memory-server` | Ephemeral in-memory MongoDB per test suite    |

---

## 3. Codebase Analysis (src/)

- **Controllers**: `auth.controller.ts`, `dashboard.controller.ts`, `exercise.controller.ts`, `feynman.controller.ts`, `game_system.controller.ts`, `learning_system.controller.ts`, `practice.controller.ts`, `tag.controller.ts`
- **Services**: `ai_explanation.service.ts` (Gemini REST + Groq fallback), `feynman.service.ts` (Groq only), `question_generation.service.ts` (Groq only)
- **Models**: `user.model.ts`, `exercise.model.ts`, `exercise_attempt.model.ts`, `exercise_tag.model.ts`, `game_system.model.ts` (`Attack`), `language_info.model.ts`, `learning_system.model.ts`, `user_tag_stats.model.ts`
- **Routes**: `auth.routes.ts`, `dashboard.routes.ts`, `exercise.routes.ts`, `feynman.routes.ts`, `game_system.routes.ts`, `learning_system.routes.ts`, `practice.routes.ts`, `tag.routes.ts`
- **Middlewares**: `auth.middleware.ts`, `learning_system.middleware.ts`
- **Utilities**: `exercise_grading.ts`, `learning_progress.ts`, `tag_stats.ts`, `validators.ts`

---

## 4. Risk Assessment

- **Business-Critical**: `learning_progress.ts` and `learning_system.controller.ts` (milestone/block progression logic). `exercise_grading.ts` and `practice.controller.ts` (answer evaluation).
- **Security-Critical**: `auth.controller.ts` and `auth.middleware.ts` (JWT generation, validation, bcrypt hashing).
- **Economy-Critical, currently UNTESTED**: `game_system.controller.ts` (`getTargets`, `attackTarget`, `getNotifications`, `getLeaderboard`). This is the only controller in the codebase with **no unit, integration, or contract test coverage**. It directly mutates user coin balances (`attackTarget` moves coins between two users in a non-atomic two-step update) and computes leaderboard rank via a `countDocuments` tie-break (`coins` desc, `createdAt` asc) that has to stay consistent between `topUsers` and `me.rank` — a good candidate for off-by-one and race-condition bugs. See [Section 8](#8-outstanding-gap--game-system--leaderboard).
- **External Dependencies (High Flakiness Risk)**: `ai_explanation.service.ts` (Gemini REST → Groq fallback; both paths must be tested explicitly) and `feynman.service.ts` (Groq only — no Gemini involved; must be mocked in all tests that trigger the Feynman flow). `question_generation.service.ts` (Groq only) is exercised indirectly through the Feynman integration tests but has no dedicated unit test file.
- **Complex Business Logic**: `learning_system.middleware.ts` (`requireLessonAccess`, `requireBlockAccess`) — multi-step DB queries with first-milestone branching; closer to integration-level complexity than simple middleware.
- **Unique Index Risk**: `exercise_attempt.model.ts` has a unique compound index on `{ userId, exerciseId }`. Integration tests running multiple submissions must use `findOneAndUpdate` with upsert (already how the controller works) or clear the collection between tests.

---

## 5. Testing Strategy (The Testing Pyramid)

1. **Unit Tests** (Target: 80% coverage enforced, 95% aspirational)
   - Focus on `services`, `utils`, and `middlewares` in complete isolation.
   - Mock all DB calls and AI service responses using Vitest's built-in `vi.mock()`.
   - For `ai_explanation.service.ts`: tests must cover both the primary Gemini path and the Groq fallback path (i.e. test that when Gemini throws, Groq is called next).
   - For `feynman.service.ts`: Groq-only — tests cover success, failure, and invalid JSON responses from Groq (no Gemini fallback path exists here).
   - `question_generation.service.ts` still needs a dedicated unit test file (currently only covered indirectly via Feynman integration tests).

2. **Integration Tests**
   - Focus on `controllers` interacting with `models` via routes.
   - Use `mongodb-memory-server` to provide an ephemeral MongoDB instance per test suite.
   - Verify DB state changes (e.g. user progress updates after exercise submission).
   - `requireLessonAccess` and `requireBlockAccess` middleware are complex enough to be covered here rather than in unit tests.
   - `game_system.controller.ts` has no integration suite yet — see [Section 8](#8-outstanding-gap--game-system--leaderboard).

3. **API Contract Tests**
   - Validate HTTP status codes, error shapes, validation responses, and required fields for all endpoints using `supertest`.
   - Explicitly test `validateObjectId` middleware (invalid ObjectId → 400) since it guards every route.
   - Covers auth, dashboard, exercise, feynman, learning system, practice, and tag routes. The `/api/action/*`, `/api/users/notifications`, and `/api/users/leaderboard` routes are **not** covered.

4. **End-to-End Backend Flow Tests**
   - Test full user journeys (Registration → Language Select → Learning → Practice → AI Feedback) through the Express app with an in-memory database and mocked external AI services.
   - AI mocks return fixed JSON matching the expected `ExplainExerciseAiResult` / `FeynmanChatAiResult` shapes.
   - The gamification loop (select target → attack → check notification → check leaderboard) is not yet covered end-to-end.

---

## 6. Infrastructure Setup (Completed)

### 6.1 `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup/env.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/services/**/*.ts',
        'src/utils/**/*.ts',
        'src/middlewares/**/*.ts',
        'src/controllers/**/*.ts',
      ],
      exclude: ['**/*.test.ts', 'tests/**'],
    },
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
```

> Coverage `thresholds` are currently commented out in the live config, so CI does not yet fail the build on a coverage regression — including the `game_system.controller.ts` gap described in Section 8.

### 6.2 `tsconfig.test.json`

Separate tsconfig to scope ESLint and TypeScript compilation for test files without polluting the production build:

```json
{
  "extends": "./tsconfig.json",
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "types": ["vitest/globals", "node"],
    "noEmit": true
  }
}
```

### 6.3 ESLint config — test file overrides

Test files use `tsconfig.test.json` as their parser project and have relaxed unsafe rules to avoid noise from test utilities and mocks:

```typescript
{
  files: ['tests/**/*.ts', '**/*.test.ts'],
  languageOptions: {
    parserOptions: {
      project: './tsconfig.test.json',
    },
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/unbound-method': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
  },
},
```

### 6.4 `tests/setup/env.setup.ts`

Runs before any test file is imported. Required because `src/config/env.ts` throws immediately on missing env vars:

```typescript
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
process.env.DB_STRING = 'mongodb://localhost:27017/test';
```

### 6.5 `tests/setup/setupDB.ts`

Reusable lifecycle helpers for integration and E2E test suites:

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongo: MongoMemoryServer;

export async function connectTestDB() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}

export async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

export async function disconnectTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongo.stop();
}
```

Usage in every integration/E2E suite:

```typescript
beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());
```

---

## 7. Folder Structure

```
tests/
  ├── setup/
  │   ├── env.setup.ts                         ✅
  │   └── setupDB.ts                           ✅
  ├── unit/
  │   ├── utils/
  │   │   ├── validators.test.ts               ✅
  │   │   ├── exercise_grading.test.ts         ✅
  │   │   └── learning_progress.test.ts        ✅
  │   ├── services/
  │   │   ├── ai_explanation.service.test.ts   ✅ # Gemini primary + Groq fallback paths
  │   │   ├── feynman.service.test.ts          ✅ # Groq only — success, failure, invalid JSON
  │   │   └── question_generation.service.test.ts  ⬜ # not yet written
  │   └── middlewares/
  │       ├── auth.middleware.test.ts          ✅
  │       └── validateObjectId.test.ts         ✅
  ├── integration/
  │   ├── auth.test.ts                         ✅
  │   ├── dashboard.test.ts                    ✅
  │   ├── practice.test.ts                     ✅
  │   ├── feynman.test.ts                      ✅
  │   ├── learning_system.test.ts              ✅
  │   ├── learning_system_middleware.test.ts   ✅ # requireLessonAccess, requireBlockAccess
  │   ├── tag.test.ts                          ✅
  │   └── game_system.test.ts                  ⬜ # not yet written — attack/targets/notifications/leaderboard
  └── api/
      ├── auth.contract.test.ts                ✅
      ├── dashboard.contract.test.ts            ✅
      ├── exercise.contract.test.ts             ✅
      ├── feynman.contract.test.ts               ✅
      ├── learning_systems.contract.test.ts      ✅
      ├── practice.contract.test.ts              ✅
      ├── tag.contract.test.ts                   ✅
      └── game_system.contract.test.ts           ⬜ # not yet written

```

---

## 8. Outstanding Gap — Game System / Leaderboard

`src/controllers/game_system.controller.ts` (routes mounted at `/api/action/targets`, `/api/action/attack`, `/api/users/notifications`, `/api/users/leaderboard`) is the newest feature in the codebase and currently has **zero automated test coverage** — no unit, integration, or contract tests exist for it anywhere in `tests/`.

Recommended coverage if this plan is picked back up:

- **`getTargets`**: excludes the caller, only returns users with `coins > 50`, respects the `$sample` size of 5, returns `count`/`language`/`users` shape; 401 when unauthenticated.
- **`attackTarget`**: 400 on invalid/missing `targetId`, 400 on self-attack, 400 when `hasAttackSlot` is false, 404 when attacker or target doesn't exist, coin math is correct on both sides (`coinsStolen = min(random 60–120, target.coins)`), `hasAttackSlot` flips to `false` after a successful attack, an `Attack` document is created with the correct before/after balances, 500 on unexpected DB errors.
- **`getNotifications`**: only returns unread attacks targeting the caller, marks them read as a side effect, empty-state shape when none exist, 401 when unauthenticated.
- **`getLeaderboard`**: `topUsers` is capped at 10 and sorted by `coins` desc / `createdAt` asc; `rank` on each `topUsers` entry matches its 1-indexed position; `me.rank` uses the same tie-break as `topUsers` (verify with same-coin users created at different times); `totalUsers` and `totalCoins` aggregate correctly; 401 when unauthenticated, 404 if the caller's user record is missing.

Because `attackTarget` updates two user documents with two separate `findByIdAndUpdate` calls rather than a single transaction, a concurrency/interruption test (e.g. simulating a failure between the two updates) would also be valuable given this is real economy-affecting logic.

---

## 9. Implementation Order

Work bottom-up: pure functions first, DB-dependent last.

| Phase | Target | Status |
| --- | --- | --- |
| **2A** | `validators.ts`, `exercise_grading.ts` | ✅ Done |
| **2B** | `learning_progress.ts` (pure functions only: `recalcLessonCompletion`, `buildDefaultBlockProgress`) | ✅ Done |
| **2C** | `auth.middleware.ts`, `validateObjectId` | ✅ Done |
| **2D** | `ai_explanation.service.ts`, `feynman.service.ts` | ✅ Done |
| **3A** | Integration: `auth.test.ts` | ✅ Done |
| **3B** | Integration: `practice.test.ts` | ✅ Done |
| **3C** | Integration: `learning_system.test.ts` + `learning_system_middleware.test.ts` | ✅ Done |
| **3D** | Integration: `feynman.test.ts` | ✅ Done |
| **3E** | Integration: `dashboard.test.ts`, `tag.test.ts` | ✅ Done |
| **4** | API contract: auth, dashboard, exercise, feynman, learning system, practice, tag | ✅ Done |
| **5** | `question_generation.service.ts` unit tests | ⬜ Not started |
| **6** | `game_system.controller.ts` — integration + contract tests (see Section 8) | ⬜ Not started |

---

> [!NOTE] This repo is now final and will not receive further feature updates. The remaining gaps (Phases 5 and 6 above) are documented here as known limitations rather than active next steps — if the test suite is ever revisited, Phase 6 (game system / leaderboard) is the highest-value addition since it's the only untested piece of logic that moves user currency.
