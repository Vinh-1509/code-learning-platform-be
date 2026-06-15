# Phase 1: Analysis & Testing Strategy

This document outlines the analysis of the `code-learning-platform-be` backend codebase and proposes a comprehensive testing strategy based on your requirements.

## 1. Tech Stack Summary

Based on `package.json` and the `src/` directory, the backend relies on:

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB
- **ORM/ODM**: Mongoose
- **Authentication**: JWT (`jsonwebtoken`) & `bcryptjs`
- **External Integrations**: Google Gemini AI (`@google/genai`)

## 2. Existing Testing Setup

**Current State**: No testing libraries or test scripts are currently configured in `package.json` or visible in the `src/` structure.

**Missing Libraries to be Installed**:

- **Test Runner**: `vitest` (Recommended over Jest for better native TypeScript and ESM support)
- **API Testing**: `supertest`
- **Database Mocking**: `mongodb-memory-server`
- **Mocking**: Vitest's built-in mocking (equivalent to Sinon/Jest)

## 3. Codebase Analysis (src/)

- **Controllers**:
  - `auth.controller.ts`
  - `exercise.controller.ts`
  - `feynman.controller.ts`
  - `learning_system.controller.ts`
  - `practice.controller.ts`
- **Services**:
  - `ai_explanation.service.ts` (Handles Google GenAI interactions)
  - `feynman.service.ts`
- **Models / Repositories**:
  - `user.model.ts`
  - `exercise.model.ts`
  - `exercise_attempt.model.ts`
  - `learning_system.model.ts`
  - `language_info.model.ts`
- **Middlewares**:
  - `auth.middleware.ts`
  - `learning_system.middleware.ts`
- **Utilities**:
  - `exercise_grading.ts`
  - `learning_progress.ts`
  - `validators.ts`

## 4. Risk Assessment

Based on the architecture, the following areas require strict testing focus:

- **Business-Critical**:
  - `learning_progress.ts` and `learning_system.controller.ts` (Core progression logic, unlocking milestones).
  - `exercise_grading.ts` and `practice.controller.ts` (Correct evaluation of user answers).
- **Security-Critical**:
  - `auth.controller.ts` and `auth.middleware.ts` (Token generation, validation, password hashing).
- **External Dependencies (High Flakiness Risk)**:
  - `ai_explanation.service.ts` and `feynman.service.ts` (Relies on external Google GenAI; requires robust mocking).
- **Complex Business Logic**:
  - Feynman learning flow and weakness tracking.

## 5. Proposed Testing Strategy (The Testing Pyramid)

1. **Unit Tests** (Target: 95%+ coverage)
   - Focus on `services`, `utils` (e.g., grading logic, progress calculation), and `middlewares` in complete isolation.
   - Mock all DB calls and AI service responses.
2. **Integration Tests**
   - Focus on `controllers` interacting with `models` via routes.
   - Use `mongodb-memory-server` to provide an ephemeral MongoDB instance per test suite.
   - Verify DB state changes (e.g., user progress updates after an exercise submission).
3. **API Contract Tests**
   - Validate HTTP status codes, error shapes, validation responses, and required fields for all endpoints using `supertest`.
4. **End-to-End Backend Flow Tests**
   - Test full user journeys (Registration -> Learning -> Practice -> AI Feedback -> Dashboard) through the Express app with an in-memory database and mocked external AI/email services.

## 6. Recommended Folder Structure

```
tests/
  ├── setup/
  │   ├── globalSetup.ts      # Global environment setup
  │   └── setupDB.ts          # mongodb-memory-server lifecycle hooks
  ├── unit/
  │   ├── services/
  │   ├── utils/
  │   └── middlewares/
  ├── integration/
  │   ├── auth.test.ts
  │   ├── practice.test.ts
  │   └── feynman.test.ts
  ├── api/
  │   └── contract.test.ts    # Contract validation tests
  └── e2e/
      └── workflows.test.ts   # Full journey tests
```

---

> [!IMPORTANT] **User Review Required** Please review the Phase 1 analysis and testing strategy. Once you approve this, we will proceed to **Phase 2: Unit Testing**, which will involve installing the recommended testing dependencies (Vitest) and writing isolated tests for the business logic (`services`, `utils`, `middlewares`). Do you approve proceeding to Phase 2?
