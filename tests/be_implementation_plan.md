# Testing Implementation Plan — `code-learning-platform-be`

This document outlines the analysis of the `code-learning-platform-be` backend codebase and the comprehensive testing strategy being implemented.

---

## 1. Tech Stack Summary

Based on `package.json` and the `src/` directory, the backend relies on:

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB
- **ORM/ODM**: Mongoose
- **Authentication**: JWT (`jsonwebtoken`) & `bcryptjs`
- **External Integrations**: Google Gemini AI (`@google/genai`), Groq (fallback)

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

- **Controllers**: `auth.controller.ts`, `exercise.controller.ts`, `feynman.controller.ts`, `learning_system.controller.ts`, `practice.controller.ts`
- **Services**: `ai_explanation.service.ts` (Gemini + Groq fallback), `feynman.service.ts`
- **Models**: `user.model.ts`, `exercise.model.ts`, `exercise_attempt.model.ts`, `learning_system.model.ts`, `language_info.model.ts`
- **Middlewares**: `auth.middleware.ts`, `learning_system.middleware.ts`
- **Utilities**: `exercise_grading.ts`, `learning_progress.ts`, `validators.ts`

---

## 4. Risk Assessment

- **Business-Critical**: `learning_progress.ts` and `learning_system.controller.ts` (milestone/block progression logic). `exercise_grading.ts` and `practice.controller.ts` (answer evaluation).
- **Security-Critical**: `auth.controller.ts` and `auth.middleware.ts` (JWT generation, validation, bcrypt hashing).
- **External Dependencies (High Flakiness Risk)**: `ai_explanation.service.ts` and `feynman.service.ts` (Gemini + Groq; must be mocked in all tests). Note: the Gemini → Groq fallback path must be tested explicitly.
- **Complex Business Logic**: `learning_system.middleware.ts` (`requireLessonAccess`, `requireBlockAccess`) — multi-step DB queries with first-milestone branching; closer to integration-level complexity than simple middleware.
- **Unique Index Risk**: `exercise_attempt.model.ts` has a unique compound index on `{ userId, exerciseId }`. Integration tests running multiple submissions must use `findOneAndUpdate` with upsert (already how the controller works) or clear the collection between tests.

---

## 5. Testing Strategy (The Testing Pyramid)

1. **Unit Tests** (Target: 80% coverage enforced, 95% aspirational)
   - Focus on `services`, `utils`, and `middlewares` in complete isolation.
   - Mock all DB calls and AI service responses using Vitest's built-in `vi.mock()`.
   - AI service tests must cover both the primary Gemini path and the Groq fallback path (i.e. test that when Gemini throws, Groq is called next).

2. **Integration Tests**
   - Focus on `controllers` interacting with `models` via routes.
   - Use `mongodb-memory-server` to provide an ephemeral MongoDB instance per test suite.
   - Verify DB state changes (e.g. user progress updates after exercise submission).
   - `requireLessonAccess` and `requireBlockAccess` middleware are complex enough to be covered here rather than in unit tests.

3. **API Contract Tests**
   - Validate HTTP status codes, error shapes, validation responses, and required fields for all endpoints using `supertest`.
   - Explicitly test `validateObjectId` middleware (invalid ObjectId → 400) since it guards every route.

4. **End-to-End Backend Flow Tests**
   - Test full user journeys (Registration → Language Select → Learning → Practice → AI Feedback) through the Express app with an in-memory database and mocked external AI services.
   - AI mocks should return fixed JSON matching the expected `ExplainExerciseAiResult` / `FeynmanChatAiResult` shapes.

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
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

### 6.2 `tsconfig.test.json`

Separate tsconfig to scope ESLint and TypeScript compilation for test files without polluting the production build:

```json
{
  "extends": "./tsconfig.json",
  "include": ["src/**/*", "tests/**/*"],
  "compilerOptions": {
    "types": ["vitest/globals", "node"]
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
  │   ├── env.setup.ts          # process.env injection — runs before all imports
  │   └── setupDB.ts            # mongodb-memory-server lifecycle hooks
  ├── unit/
  │   ├── utils/
  │   │   ├── validators.test.ts
  │   │   ├── exercise_grading.test.ts
  │   │   └── learning_progress.test.ts
  │   ├── services/
  │   │   ├── ai_explanation.service.test.ts   # includes Gemini → Groq fallback path
  │   │   └── feynman.service.test.ts
  │   └── middlewares/
  │       ├── auth.middleware.test.ts
  |       └── validateObjectId.test.ts
  ├── integration/
  │   ├── auth.test.ts
  │   ├── practice.test.ts
  │   ├── feynman.test.ts
  │   ├── learning_system.test.ts
  │   └── learning_system_middleware.test.ts   # requireLessonAccess, requireBlockAccess
  ├── api/
  │   └── contract.test.ts      # HTTP status codes, error shapes, required fields
  └── e2e/
      └── workflows.test.ts     # Full user journey tests
```

---

## 8. Implementation Order

Work bottom-up: pure functions first, DB-dependent last.

| Phase | Target | Reason |
| --- | --- | --- |
| **2A** | `validators.ts`, `exercise_grading.ts` | Zero dependencies; best first test files |
| **2B** | `learning_progress.ts` (pure functions only: `recalcLessonCompletion`, `buildDefaultBlockProgress`) | Pure utils before DB-dependent functions |
| **2C** | `auth.middleware.ts`, `validateObjectId` | No DB needed; mock `jwt.verify` only |
| **2D** | `ai_explanation.service.ts`, `feynman.service.ts` | Mock `fetch`; test primary + fallback paths |
| **3A** | Integration: `auth.test.ts` | Simplest controller; establishes supertest + DB pattern |
| **3B** | Integration: `practice.test.ts` | Tests unique-index upsert behaviour |
| **3C** | Integration: `learning_system.test.ts` + middleware | Most complex; depends on patterns from 3A/3B |
| **3D** | Integration: `feynman.test.ts` | Depends on learning system progress state |
| **4** | API contract + E2E workflows | Written last when all routes are stable |

---

> [!NOTE] **Next Step: Phase 2A** Begin with `tests/unit/utils/validators.test.ts` and `tests/unit/utils/exercise_grading.test.ts`. These have zero external dependencies and will confirm the entire test infrastructure (Vitest config, env setup, coverage reporting) is working correctly before touching anything DB-related.
