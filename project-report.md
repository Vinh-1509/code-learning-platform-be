# Code Learning Platform BE - Project Report

## 1. Project Overview

This project is a TypeScript/Express backend for a code learning platform focused on beginner programming students. The platform currently supports C++ and Java learning paths, structured lessons, practice exercises, AI explanations, Feynman-style concept checks, weakness tracking by exercise tags, a dashboard summary for learners, and a lightweight gamification layer (attacks + leaderboard).

The main learning idea is:

1. A user selects a programming language.
2. The backend provides a roadmap made of milestones, lessons, and blocks.
3. Each block contains theory, code examples, and required practice exercises.
4. The user submits exercise answers and gets deterministic grading.
5. The user then explains the concept through a Feynman chat.
6. Passing the Feynman check completes the block and unlocks the next learning item.

## 2. Tech Stack

| Area | Technology |
| --- | --- |
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express |
| Database | MongoDB |
| ODM | Mongoose |
| Authentication | JWT access token |
| Password hashing | bcryptjs |
| AI providers | Gemini for exercise explanation, Groq fallback, Groq for Feynman |
| Testing | Vitest, Supertest, mongodb-memory-server |
| Code quality | ESLint, Prettier, Husky |

## 3. Current Module Structure

| Folder/File Area | Purpose |
| --- | --- |
| `src/app.ts` | Creates the Express app, enables CORS/JSON parsing, and mounts all API route groups (including the gamification routes). |
| `src/index.ts` | Connects MongoDB, auto-runs seed when the roadmap collection is empty, and starts the server. |
| `src/config` | Stores environment and MongoDB connection configuration. |
| `src/controllers` | Contains request handlers for auth, learning system, practice, AI explanation, Feynman, tags, dashboard, and the gamification/attack system. |
| `src/routes` | Defines Express route paths and middleware wiring. |
| `src/models` | Defines Mongoose schemas for users, roadmap data, exercises, attempts, tags, tag stats, and attack records. |
| `src/interfaces` | Defines TypeScript request/response/data types. |
| `src/middlewares` | Handles JWT auth, language selection checks, ObjectId validation, and lesson access checks. |
| `src/services` | Contains AI-related service logic for exercise explanation, Feynman chat, and Feynman follow-up question generation. |
| `src/utils` | Contains reusable grading, progress, tag-stat, and validation helpers. |
| `src/types` | Express `Request` augmentation (`req.user`) and shared request-body types (e.g. attack payload). |
| `src/seed.ts` | Seeds roadmaps, milestones, lessons, blocks, exercises, exercise tags, and language information. |
| `docs` | Contains API/database/platform planning documents. |
| `tests` | Contains unit, integration, and API-contract tests for the backend. |

## 4. Authentication

The backend has a complete basic authentication flow.

Implemented APIs:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a new user with email and password. |
| `POST` | `/api/auth/login` | Login and receive an access token. |
| `POST` | `/api/auth/logout` | Returns logout success for authenticated users. |
| `GET` | `/api/auth/me` | Returns the authenticated user profile. |
| `PATCH` | `/api/users/me` | Update the authenticated user's `username`, `fullName`, and/or `hasSeenTour`. |

Current behavior:

- Passwords are hashed with bcrypt before being saved.
- Login returns a JWT access token.
- Protected APIs use `Authorization: Bearer <token>`.
- The project intentionally uses access token login only at the moment.
- Logout does not invalidate the token server-side; the frontend should remove the stored access token.
- Profile updates return `409` if the requested `username` is already taken.

## 5. Learning System

The learning system is built around:

| Data Model | Purpose |
| --- | --- |
| `Roadmap` | One learning path per language, such as C++ or Java. |
| `Milestone` | A major stage inside a roadmap. |
| `Lesson` | A group of learning blocks under a milestone. |
| `Block` | A unit of learning content with theory, code, practice, and Feynman question. |
| `UserMilestoneProgress` | Per-user milestone status and completion percentage. |
| `UserLessonProgress` | Per-user lesson status, block progress, Feynman state, chat history, and completion percentage. |

Implemented APIs:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/languages` | Get available programming languages with language info. |
| `GET` | `/api/languages/:languageId` | Get detail for one language/roadmap. |
| `POST` | `/api/languages/select` | Save the user's selected language. |
| `GET` | `/api/learning/milestones` | Get milestones for the selected language with user progress. |
| `GET` | `/api/learning/milestones/:milestoneId` | Get one milestone detail. |
| `GET` | `/api/learning/milestones/:milestoneId/lessons` | Get lessons under a milestone with progress status. |
| `GET` | `/api/learning/lessons/:lessonId` | Get lesson detail with populated blocks and block status. |

Progress statuses are standardized as:

- `locked`
- `active`
- `completed`

Current learning behavior:

- The first milestone/lesson/block can become active for a new user.
- Later content stays locked until previous required progress is completed.
- Lesson progress is created lazily when the user opens or interacts with a lesson.
- Block completion is based on Feynman pass, not only exercise submit.

## 6. Practice Exercises

The project supports interactive exercises with two current types:

- `fill_blank`
- `drag_drop`

Exercise data includes:

| Field | Purpose |
| --- | --- |
| `lessonId` | Links exercise to a lesson. Can be empty for free practice. |
| `tagId` | Links exercise to one or more high-level tags. |
| `language` | `C++` or `Java`. |
| `type` | `fill_blank` or `drag_drop`. |
| `level` | `easy`, `medium`, or `hard`. |
| `data` | UI payload for placeholders/options/drag blocks. |
| `correctAnswer` | Backend source of truth for grading. |
| `explanation` | Official explanation. |
| `hints` | Progressive hints by hint level. |

Implemented APIs:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/practice/exercises` | Get exercises with pagination and filters. |
| `GET` | `/api/practice/exercises/:exerciseId` | Get exercise detail without exposing `correctAnswer`. |
| `POST` | `/api/practice/exercises/:exerciseId/submit` | Submit an answer and receive correctness result. |
| `POST` | `/api/practice/exercises/:exerciseId/hint` | Request the next available hint. |
| `GET` | `/api/practice/exercises/:exerciseId/history` | Get the user's latest attempt for an exercise. |

Supported query params for exercise list:

| Query Param | Purpose |
| --- | --- |
| `page` | Page number. |
| `limit` | Page size, capped by backend. |
| `q` | Search by title/instruction. |
| `language` | Filter by `C++` or `Java`. |
| `difficulty` | Filter by `easy`, `medium`, or `hard`. |
| `tagId` | Filter by exercise tag. |
| `status` | Filter by computed user status: `locked`, `active`, `completed`. |

Current exercise behavior:

- The backend grades answers deterministically using `correctAnswer`.
- Each placeholder/field is graded independently.
- Submit returns `correct`, `items`, and `attemptNumber`, plus a reward payload (`prizeType`, `amount`, `currentCoin`, `hasAttackSlot`) on a correct answer, rate-limited to once per 6-hour cooldown per exercise.
- `ExerciseAttempt` stores only the latest attempt per user and exercise.
- `attemptNumber` still tracks how many times the user has submitted.
- Once an exercise is passed, later wrong submits do not remove the passed state.
- Free practice exercises are active by default.
- Lesson-linked exercises are active only when their lesson/block is active.

## 7. AI Exercise Explanation

The project has an AI explanation feature for submitted exercise answers.

Implemented API:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/exercises/:exerciseId/explain` | Explain the user's answer field by field. |

Current behavior:

- The request receives an `answer` object.
- The backend loads the exercise and grades it first.
- AI does not decide whether the answer is correct.
- AI only explains the backend grading result.
- Each field gets an explanation whether it is correct or incorrect.
- The AI is instructed not to reveal the exact correct answer directly.
- Gemini is tried first.
- Groq is used as fallback if Gemini fails.
- If both AI calls fail or return invalid JSON, the backend returns a safe fallback explanation.

Typical response includes:

- `exerciseId`
- `isCorrect`
- `feedback`
- `items`
- `suggestion`

## 8. Feynman Learning Check

The project has a Feynman-style chatbot flow per block.

Implemented APIs:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/feynman/block/:blockId/question` | Get the Feynman question for a block. |
| `POST` | `/api/feynman/block/:blockId/chat` | Send a learner explanation and get AI feedback/pass result. |
| `GET` | `/api/feynman/block/:blockId/history` | Get chat history for a block. |
| `POST` | `/api/feynman/block/:blockId/history/reset` | Reset chat history to the initial question while keeping pass status. |
| `GET` | `/api/feynman/block/:blockId/stats` | Get whether the block has passed Feynman. |

Current behavior:

- Feynman chat is stored inside `UserLessonProgress.blockProgress[].chatHistory`.
- The first history message is the assistant's block question.
- A user can access Feynman only if the block is unlocked.
- If the block has required practice exercises, all required exercises must be passed before Feynman starts.
- Groq is used to evaluate the explanation.
- The prompt is intentionally beginner-friendly and grades generously.
- After 10 consecutive failed attempts on a block, a 12-hour cooldown is applied before the learner can try again.
- If Feynman passes, the backend:
  - marks `isFeynmanPassed` as true,
  - marks the block as `completed`,
  - unlocks the next block if available,
  - recalculates lesson completion,
  - marks the lesson completed if all blocks are completed,
  - updates milestone completion percentage,
  - unlocks the next milestone when a milestone reaches 100%.

## 9. Exercise Tags And Weakness Tracking

The project includes high-level exercise tags and per-user weakness statistics.

Implemented models:

| Model          | Purpose                                         |
| -------------- | ----------------------------------------------- |
| `ExerciseTag`  | Stores tag name and description.                |
| `UserTagStats` | Stores per-user attempts/failures for each tag. |

Implemented APIs:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/tags/weakness` | Get the user's weak tags sorted by failure rate. |
| `GET` | `/api/tags/:tagId/info` | Get one tag with the current user's stats. |

Current behavior:

- Every exercise can have multiple `tagId` values.
- On submit, the backend updates stats for all tags attached to the exercise.
- `totalAttempts` increments on every submit.
- `failAttempts` increments when the submit is wrong.
- A tag becomes weak when it has at least 3 attempts and failure rate is at least 60%.
- Weak tags are sorted by highest failure rate first, then by failed attempts.
- Practice exercise list can filter by `tagId`, but the list endpoint itself does not automatically re-rank or flag exercises as "recommended" based on weakness — that combination is left to the client.

## 10. Gamification — Attacks & Leaderboard

The project includes a lightweight competitive layer on top of the core learning loop, backed by a coin balance and attack slots on the `User` model.

Implemented model:

| Model | Purpose |
| --- | --- |
| `Attack` | Records each attack: attacker/target ids and names, coins stolen, before/after balances for both sides, and whether the target has read the notification. |

Implemented APIs:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/action/targets` | Get up to 5 random users (same language pool, excluding self) with more than 50 coins to attack. |
| `POST` | `/api/action/attack` | Spend an attack slot to steal coins (60–120, capped at the target's balance) from a chosen target. |
| `GET` | `/api/users/notifications` | Get unread "you were attacked" notifications for the current user; marks them read as a side effect. |
| `GET` | `/api/users/leaderboard` | Get the top 10 users by coins plus the caller's own rank. |

Current behavior:

- `attackTarget` rejects invalid/missing `targetId`, self-attacks, and attacks with no available attack slot (`hasAttackSlot: false`).
- A successful attack updates both users' coin balances and consumes the attacker's attack slot in two separate `findByIdAndUpdate` calls (not a single transaction).
- Leaderboard rank (`me.rank` and each `topUsers[].rank`) uses the same tie-break: coins descending, then account creation date ascending (older account ranks higher on ties).
- **This module currently has no automated test coverage** (no unit, integration, or contract tests reference `game_system.controller.ts`), unlike every other controller in the codebase.

## 11. Dashboard

The project includes a learner dashboard API.

Implemented API:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/dashboard` | Get current user, selected roadmap, progress stats, milestones, and review summary. |

Dashboard currently returns:

| Field | Meaning |
| --- | --- |
| `user` | Basic user profile and selected language. |
| `roadmap` | Current roadmap for selected language. |
| `stats.totalLessons` | Total lessons in the selected roadmap. |
| `stats.totalLearnedLessons` | Total completed lessons in the selected roadmap. |
| `stats.totalExercises` | Total exercises linked to lessons in the selected roadmap. |
| `stats.totalCompletedExercises` | Total passed exercises in the selected roadmap. |
| `stats.overallProgress` | Average milestone completion percentage. |
| `stats.weakTagsCount` | Number of weak tags for the user. |
| `milestones` | Milestone status and completion percentages. |
| `dailyReview.pendingCount` | Currently returns `0` as a placeholder. |

Note: the dashboard does not currently surface coins, attack slots, or leaderboard rank — that data must be fetched separately via `/api/auth/me` and `/api/users/leaderboard`.

## 12. Seed Data

The seed script currently creates:

| Seeded Data | Count        |
| ----------- | ------------ |
| Roadmaps    | 2: C++, Java |
| Milestones  | 4            |
| Lessons     | 10           |
| Blocks      | 30           |
| Exercises   | 31           |

Seeded learning paths include:

- C++ roadmap.
- Java roadmap.
- Environment setup lessons for both C++ and Java.
- Beginner lessons for variables, data types, control flow, loops, classes, objects, inheritance, polymorphism, and interfaces.
- Exercise tags such as variables, control flow, loops, OOP, inheritance, input/output, and environment setup.

The seed script clears and recreates learning data, exercise attempts, tags, tag stats, and language info. It does not clear users, attack records, or coin balances.

## 13. Main Learning Flow

Current intended user flow:

1. Register or login.
2. Select a language.
3. Load dashboard or milestones.
4. Open active milestone.
5. Open active lesson.
6. Read the active block theory/code.
7. Submit required practice exercise.
8. If the exercise is correct, the exercise attempt becomes passed (and may award a coin/attack-slot reward).
9. Start Feynman for the block.
10. If Feynman passes, the block becomes completed.
11. The next block unlocks.
12. When all blocks are completed, the lesson becomes completed.
13. Milestone progress updates based on completed lessons.
14. When a milestone reaches 100%, the next milestone unlocks.

The attack/leaderboard loop (Section 10) runs independently of this core flow and is not gated by learning progress beyond having coins and an attack slot.

## 14. Environment Variables

The backend uses environment variables for server config, database, auth, and AI providers.

Important variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port the server listens on (defaults to `3000`). |
| `DB_STRING` | MongoDB connection string. May contain a literal `DB_PASSWORD` placeholder that gets substituted at connect time. |
| `DB_PASSWORD` | Optional password substituted into `DB_STRING`'s `DB_PASSWORD` placeholder, if present. |
| `JWT_SECRET` | Secret for signing access tokens. |
| `JWT_EXPIRES_IN` | Access token lifetime. |
| `REFRESH_SECRET` | Present in config, but refresh-token flow is not currently implemented. |
| `REFRESH_EXPIRES_IN` | Present in config, but refresh-token flow is not currently implemented. |
| `GEMINI_API_KEY` | Gemini API key for AI exercise explanation. |
| `GEMINI_MODEL` | Gemini model name. |
| `GROQ_API_KEY` | Groq API key for fallback explanation, Feynman chat, and Feynman follow-up question generation. |
| `GROQ_MODEL` | Groq model name. |

`JWT_SECRET`, `REFRESH_SECRET`, and `DB_STRING` are required at startup — the app throws immediately if any is missing.

## 15. What Is Already Done

The backend currently has these completed capabilities:

- User registration and login with JWT.
- Profile fetch and update (`GET`/`PATCH` on `me`).
- Language selection.
- Roadmap/milestone/lesson/block content APIs.
- Per-user milestone, lesson, and block progress.
- Lower-case status standardization: `locked`, `active`, `completed`.
- Practice exercise listing, detail, submit, hint, and latest attempt history.
- Backend grading for both fill-blank and drag-drop style answers.
- Per-field correctness result for exercises.
- Exercise status returned to frontend as locked/active/completed.
- Coin/attack-slot rewards on a correct exercise submission, rate-limited per exercise.
- AI explanation endpoint for exercise answers.
- Gemini plus Groq fallback for AI explanation.
- Feynman chatbot per block, including a fail-cooldown mechanism.
- Feynman pass unlocks next block and updates lesson/milestone progress.
- Exercise tags.
- User tag weakness tracking.
- Weakness tag APIs.
- Dashboard API with learning and exercise totals.
- Gamification: random targets, attacking, attack notifications, and a coin leaderboard.
- Seed data for C++ and Java learning paths.
- Test setup covering unit, integration, and API-contract layers for every controller except the gamification module.
- API/database/platform documentation files.

## 16. Current Limitations And Notes

These are important current limitations:

- Logout does not invalidate access tokens server-side.
- Refresh-token login is not implemented, even though refresh env variables exist.
- Exercise submit does not directly unlock blocks or lessons; Feynman pass is responsible for block completion and unlock flow.
- Exercise attempt history stores only the latest attempt document, not a full list of all previous answers.
- Daily review is not implemented yet; dashboard currently returns `pendingCount: 0`, and no `/api/repetition/*` routes are mounted.
- AI features depend on external provider availability and API keys.
- Feynman currently uses Groq only.
- The gamification module (`game_system.controller.ts` — targets, attack, notifications, leaderboard) has no automated test coverage, and `attackTarget` updates both users' balances in two separate, non-atomic writes.
- Some older docs may still describe planned features that are not fully implemented.

## 17. How To Run

Common commands:

```bash
yarn
yarn dev
yarn seed
yarn build
yarn lint
yarn test:run
```

Typical local test order:

1. Run `yarn dev`.
2. Register a user.
3. Login and copy the access token.
4. Select a language.
5. Get milestones.
6. Get lessons.
7. Get lesson detail and copy an exercise/block id.
8. Submit practice exercise.
9. Call AI explanation if needed.
10. Call Feynman question/chat.
11. Check dashboard and progress APIs.
12. Optionally call `/api/action/targets`, `/api/action/attack`, and `/api/users/leaderboard` to exercise the gamification flow.
