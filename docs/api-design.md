# API Design

> **Base URL:** `/api`
> `isAuth: Yes` — requires a valid `Authorization: Bearer <access_token>` header.
> Priority levels: **HIGH** | **LOW**

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Practice System](#2-practice-system)
3. [AI Feynman](#3-ai-feynman)
4. [Repetition](#4-repetition)
5. [Tag Stats](#5-tag-stats)
6. [Learning System](#6-learning-system)
7. [Other](#7-other)

---

## 1. Authentication

> Login, Register, Password Reset, Logout

| Method | Endpoint | isAuth | Priority |
|---|---|---|---|
| POST | `/api/auth/register` | No | HIGH |
| POST | `/api/auth/login` | No | HIGH |
| POST | `/api/auth/logout` | Yes | HIGH |
| POST | `/api/auth/refresh` | No | HIGH |
| GET | `/api/auth/me` | Yes | LOW |
| POST | `/api/auth/forgot-password` | No | LOW |
| POST | `/api/auth/reset-password` | No | LOW |
| POST | `/api/auth/verify-email` | No | LOW |

---

### POST `/api/auth/register`

Create a new user. Email must be unique. Password is hashed before storing.

**Request Body:**
```json
{
  "email": "alice@example.com",
  "password": "Secret123!"
}
```

**Response `201`:**
```json
{
  "message": "User registered successfully"
}
```

**Error responses:**
```json
{ "message": "Email and password are required" }   // 400
{ "message": "Email already registered" }          // 409
{ "message": "Internal server error" }             // 500
```

---

### POST `/api/auth/login`

Check if email exists in DB, check hashed password, return tokens to user if all checks pass.

**Request Body:**
```json
{
  "email": "alice@example.com",
  "password": "Secret123!"
}
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error responses:**
```json
{ "message": "Email and password are required" }  // 400
{ "message": "Invalid credentials" }              // 401
```

---

### POST `/api/auth/logout`

Log user out. Server deletes the refresh token from DB.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200`:**
```json
{
  "message": "Logged out successfully"
}
```

---

### POST `/api/auth/refresh`

Generate a new access token using a valid refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error responses:**
```json
{ "message": "Invalid refresh token" }  // 401
```

---

### GET `/api/auth/me`

Get current authenticated user info.

**Response `200`:**
```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "email": "alice@example.com",
  "username": "alice",
  "fullName": "Alice Nguyen",
  "selectedLanguage": ["C++"],
  "createdAt": "2024-01-15T08:30:00.000Z"
}
```

---

### POST `/api/auth/forgot-password`

Generate a reset token and send it via email. Always returns the same message for security (prevents email enumeration).

**Request Body:**
```json
{
  "email": "alice@example.com"
}
```

**Response `200`:**
```json
{
  "message": "If that email exists, a reset link has been sent"
}
```

---

### POST `/api/auth/reset-password`

Validate the reset token and update the password (hashed).

**Request Body:**
```json
{
  "reset_pw_token": "a1b2c3d4e5f6...",
  "new_password": "NewSecret456!"
}
```

**Response `200`:**
```json
{
  "message": "Password reset successfully"
}
```

**Error responses:**
```json
{ "message": "Invalid or expired token" }  // 400
```

---

### POST `/api/auth/verify-email`

Verify user email using the token sent during registration.

**Request Body:**
```json
{
  "verify_token": "a1b2c3d4e5f6..."
}
```

**Response `200`:**
```json
{
  "message": "Email verified successfully"
}
```

**Error responses:**
```json
{ "message": "Invalid or expired token" }  // 400
```

---

## 2. Practice System

| Method | Endpoint | isAuth | Priority |
|---|---|---|---|
| GET | `/api/practice/exercises` | Yes | HIGH |
| GET | `/api/practice/exercises/:exerciseId` | Yes | HIGH |
| POST | `/api/practice/exercises/:exerciseId/submit` | Yes | HIGH |
| POST | `/api/practice/exercises/:exerciseId/hint` | Yes | HIGH |
| GET | `/api/practice/exercises/:exerciseId/history` | Yes | HIGH |

---

### GET `/api/practice/exercises`

Get a list of exercises. Supports searching, filtering, and pagination via query parameters.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `q` | string | Keyword search |
| `topic` | string | Filter by tag/topic (e.g. `hashing`) |
| `difficulty` | string | `easy` \| `medium` \| `hard` |
| `language` | string | `C++` \| `Java` |
| `page` | int | Page number (default: 1) |
| `limit` | int | Results per page (default: 10) |

**Response `200`:**
```json
{
  "total": 42,
  "page": 1,
  "limit": 10,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "title": "Fill in the variable type",
      "language": "C++",
      "type": "fill_blank",
      "level": "easy",
      "tags": [
        { "_id": "64f1a2b3c4d5e6f7a8b9c0e1", "name": "variables" }
      ],
      "instruction": "Fill in the correct data type for the variable below."
    }
  ]
}
```

---

### GET `/api/practice/exercises/:exerciseId`

Get details of a specific exercise. **Does NOT include `correctAnswer`.**

**Response `200`:**
```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
  "title": "Fill in the variable type",
  "language": "C++",
  "type": "fill_blank",
  "level": "easy",
  "instruction": "Fill in the correct data type for the variable below.",
  "data": {
    "template": ["", " a = 10;", "cout << a;"],
    "placeholders": { "input_1": "type" },
    "options": ["int", "float", "string", "bool"]
  },
  "hints": {
    "1": "Think about what type stores whole numbers.",
    "2": "It is a 4-byte integer type."
  },
  "feynmanQuestion": "Can you explain what a data type is in your own words?"
}
```

---

### POST `/api/practice/exercises/:exerciseId/submit`

Submit an answer and get a result. On pass, spaced repetition schedule is updated.

**Request Body:**
```json
{
  "answer": { "input_1": "int" }
}
```

**Response `200` — correct:**
```json
{
  "correct": true,
  "explanation": "int is the correct type for storing whole numbers like 10 in C++."
}
```

**Response `200` — wrong:**
```json
{
  "correct": false,
  "explanation": "float is used for decimal numbers, not whole numbers. Try int instead."
}
```

---

### POST `/api/practice/exercises/:exerciseId/hint`

Request a hint. Tracks and increments hint usage level.

**Response `200`:**
```json
{
  "hintLevel": 1,
  "hint": "Think about what type stores whole numbers."
}
```

---

### GET `/api/practice/exercises/:exerciseId/history`

Get the user's past attempts and answers for a specific exercise.

**Response `200`:**
```json
[
  {
    "_id": "64f1a2b3c4d5e6f7a8b9c0f1",
    "exerciseId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "isPassed": false,
    "isFeynmanPassed": false,
    "hintLevel": 1,
    "userAnswer": { "input_1": "float" },
    "attemptNumber": 1,
    "attemptedAt": "2024-03-01T10:00:00.000Z"
  },
  {
    "_id": "64f1a2b3c4d5e6f7a8b9c0f2",
    "exerciseId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "isPassed": true,
    "isFeynmanPassed": true,
    "hintLevel": 1,
    "userAnswer": { "input_1": "int" },
    "attemptNumber": 2,
    "attemptedAt": "2024-03-02T09:15:00.000Z"
  }
]
```

---

## 3. AI Feynman

| Method | Endpoint | isAuth | Priority |
|---|---|---|---|
| GET | `/api/feynman/block/:blockId/question` | Yes | HIGH |
| POST | `/api/feynman/block/:blockId/chat` | Yes | HIGH |
| GET | `/api/feynman/block/:blockId/history` | Yes | HIGH |
| GET | `/api/feynman/block/:blockId/stats` | Yes | HIGH |
| GET | `/api/feynman/exercise/:exerciseId/question` | Yes | HIGH |
| POST | `/api/feynman/exercise/:exerciseId/chat` | Yes | LOW |
| GET | `/api/feynman/exercise/:exerciseId/history` | Yes | LOW |
| GET | `/api/feynman/exercise/:exerciseId/stats` | Yes | LOW |

---

### GET `/api/feynman/block/:blockId/question`

Fetch `feynmanQuestion` from the `blocks` table.

**Response `200`:**
```json
{
  "blockId": "64f1a2b3c4d5e6f7a8b9c0b1",
  "feynmanQuestion": "Can you explain what a pointer is as if you were teaching a 10-year-old?"
}
```

---

### POST `/api/feynman/block/:blockId/chat`

Submit a user message. Backend invokes AI, updates `chatHistory`, and sets `isFeynmanPassed: true` if criteria are met.

**Request Body:**
```json
{
  "message": "A pointer is like an address. It stores where a value lives in memory, not the value itself."
}
```

**Response `200`:**
```json
{
  "reply": "Great analogy! That is exactly right. Can you tell me what happens when you dereference a pointer?",
  "isFeynmanPassed": false
}
```

**Response `200` — when passed:**
```json
{
  "reply": "Excellent explanation! You clearly understand this concept.",
  "isFeynmanPassed": true
}
```

---

### GET `/api/feynman/block/:blockId/history`

Fetch the `chatHistory` array for this block from the user's progress record.

**Response `200`:**
```json
{
  "blockId": "64f1a2b3c4d5e6f7a8b9c0b1",
  "chatHistory": [
    { "role": "assistant", "content": "Can you explain what a pointer is as if you were teaching a 10-year-old?" },
    { "role": "user",      "content": "A pointer stores a memory address, not a value." },
    { "role": "assistant", "content": "Correct! What happens when you dereference it?" }
  ]
}
```

---

### GET `/api/feynman/block/:blockId/stats`

Check `isFeynmanPassed` in `user_lesson_progress` for the current user.

**Response `200`:**
```json
{
  "blockId": "64f1a2b3c4d5e6f7a8b9c0b1",
  "isFeynmanPassed": true
}
```

---

### GET `/api/feynman/exercise/:exerciseId/question`

Fetch `feynmanQuestion` from the `exercises` table.

**Response `200`:**
```json
{
  "exerciseId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "feynmanQuestion": "Why do we declare a variable type in C++ before using it?"
}
```

---

### POST `/api/feynman/exercise/:exerciseId/chat`

Submit a user message. Backend invokes AI, updates `chatHistory`, and sets `isFeynmanPassed: true` if criteria are met.

**Request Body:**
```json
{
  "message": "Because C++ needs to know how much memory to allocate for the variable."
}
```

**Response `200`:**
```json
{
  "reply": "Exactly right! Memory allocation is the key reason. Can you give an example?",
  "isFeynmanPassed": false
}
```

---

### GET `/api/feynman/exercise/:exerciseId/history`

Fetch the `chatHistory` for this exercise from `exercise_attempt`.

**Response `200`:**
```json
{
  "exerciseId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "chatHistory": [
    { "role": "assistant", "content": "Why do we declare a variable type in C++?" },
    { "role": "user",      "content": "So the compiler knows how much memory to allocate." },
    { "role": "assistant", "content": "Perfect! That is exactly correct." }
  ]
}
```

---

### GET `/api/feynman/exercise/:exerciseId/stats`

Check `isFeynmanPassed` in `exercise_attempt` for the current user.

**Response `200`:**
```json
{
  "exerciseId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "isFeynmanPassed": false
}
```

---

## 4. Repetition

| Method | Endpoint | isAuth | Priority |
|---|---|---|---|
| GET | `/api/repetition/daily-tasks` | Yes | LOW |
| GET | `/api/repetition/:exerciseId/stats` | Yes | LOW |

---

### GET `/api/repetition/daily-tasks`

Fetch exercises where `nextReviewDate <= now()`. Returns count breakdown by status.

**Response `200`:**
```json
{
  "summary": {
    "total": 8,
    "learning": 3,
    "reviewing": 5
  },
  "tasks": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "title": "Fill in the variable type",
      "language": "C++",
      "level": "easy",
      "type": "fill_blank",
      "status": "Learning",
      "nextReviewDate": "2024-03-05T00:00:00.000Z"
    }
  ]
}
```

---

### GET `/api/repetition/:exerciseId/stats`

Retrieve the Spaced Repetition status and next review date for a specific exercise.

**Response `200`:**
```json
{
  "exerciseId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "status": "Reviewing",
  "interval": 4,
  "nextReviewDate": "2024-03-09T00:00:00.000Z",
  "passReviewDate": "2024-03-05T00:00:00.000Z"
}
```

---

## 5. Tag Stats

| Method | Endpoint | isAuth | Priority |
|---|---|---|---|
| GET | `/api/tags/weakness` | Yes | HIGH |
| GET | `/api/tags/:tagId/info` | Yes | HIGH |
| GET | `/api/tags/:tagId/exercises` | Yes | HIGH |

---

### GET `/api/tags/weakness`

Retrieve all tags where `isWeak: true`, with attempt stats.

**Response `200`:**
```json
[
  {
    "_id": "64f1a2b3c4d5e6f7a8b9c0e1",
    "name": "pointers",
    "description": "Memory address and pointer operations",
    "totalAttempts": 10,
    "failAttempts": 7,
    "failureRate": 70
  }
]
```

---

### GET `/api/tags/:tagId/info`

Deep dive into a specific tag with failure rate and performance metrics.

**Response `200`:**
```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0e1",
  "name": "pointers",
  "description": "Memory address and pointer operations",
  "totalAttempts": 10,
  "failAttempts": 7,
  "failureRate": 70,
  "isWeak": true,
  "updatedAt": "2024-03-05T10:00:00.000Z"
}
```

---

### GET `/api/tags/:tagId/exercises`

Retrieve exercises for a tag. Supports limiting and sorting.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `limit` | int | Max results (default: 10) |
| `sort` | string | `level` \| `order` |

**Response `200`:**
```json
[
  {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
    "title": "Fill in the variable type",
    "language": "C++",
    "type": "fill_blank",
    "level": "easy",
    "instruction": "Fill in the correct data type."
  }
]
```

---

## 6. Learning System

| Method | Endpoint | isAuth | Priority |
|---|---|---|---|
| GET | `/api/learning/milestones` | Yes | HIGH |
| GET | `/api/learning/milestones/:milestoneId` | Yes | HIGH |
| GET | `/api/learning/milestones/:milestoneId/lessons` | Yes | HIGH |
| GET | `/api/learning/lessons/:lessonId` | Yes | HIGH |
| POST | `/api/learning/blocks/:blockId/complete` | Yes | HIGH |

---

### GET `/api/learning/milestones`

Get list of milestones with user progress attached.

**Response `200`:**
```json
[
  {
    "_id": "64f1a2b3c4d5e6f7a8b9c0a1",
    "title": "C++ Fundamentals",
    "description": "Variables, types, control flow and functions.",
    "order": 1,
    "progress": {
      "status": "Active",
      "completionPercentage": 45
    }
  },
  {
    "_id": "64f1a2b3c4d5e6f7a8b9c0a2",
    "title": "Object Oriented Programming",
    "description": "Classes, inheritance, polymorphism.",
    "order": 2,
    "progress": {
      "status": "Locked",
      "completionPercentage": 0
    }
  }
]
```

---

### GET `/api/learning/milestones/:milestoneId`

Get details of a specific milestone with user progress.

**Response `200`:**
```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0a1",
  "title": "C++ Fundamentals",
  "description": "Variables, types, control flow and functions.",
  "order": 1,
  "progress": {
    "status": "Active",
    "completionPercentage": 45,
    "updatedAt": "2024-03-04T14:00:00.000Z"
  }
}
```

---

### GET `/api/learning/milestones/:milestoneId/lessons`

Get all lessons belonging to the milestone with progress state.

**Response `200`:**
```json
[
  {
    "_id": "64f1a2b3c4d5e6f7a8b9c0c1",
    "title": "Variables and Data Types",
    "order": 1,
    "progress": {
      "isCompleted": true,
      "completionPercentage": 100
    }
  },
  {
    "_id": "64f1a2b3c4d5e6f7a8b9c0c2",
    "title": "Control Flow",
    "order": 2,
    "progress": {
      "isCompleted": false,
      "completionPercentage": 50
    }
  }
]
```

---

### GET `/api/learning/lessons/:lessonId`

Get full lesson content with all blocks embedded. Block state reflects current user progress.

**Response `200`:**
```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0c1",
  "title": "Variables and Data Types",
  "order": 1,
  "blocks": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0b1",
      "content": [
        {
          "type": "theory",
          "data": {
            "order": 1,
            "text": "A variable is a named memory location that stores a value.",
            "image": "https://cdn.example.com/images/variables.png"
          }
        },
        {
          "type": "code",
          "data": {
            "order": 2,
            "code": "int a = 10;\ncout << a;",
            "explanation": "Here we declare an integer variable and print it."
          }
        },
        {
          "type": "practice",
          "data": {
            "order": 3,
            "exerciseId": "64f1a2b3c4d5e6f7a8b9c0d2",
            "required": true
          }
        }
      ],
      "feynmanQuestion": "Can you explain what a variable is in your own words?",
      "state": "completed",
      "isFeynmanPassed": true
    },
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0b2",
      "content": [
        {
          "type": "theory",
          "data": {
            "order": 1,
            "text": "C++ supports several data types: int, float, double, char, bool.",
            "image": null
          }
        }
      ],
      "feynmanQuestion": "What is the difference between int and float?",
      "state": "active",
      "isFeynmanPassed": false
    }
  ],
  "progress": {
    "completionPercentage": 50,
    "isCompleted": false,
    "lastAccessed": "2024-03-05T09:00:00.000Z"
  }
}
```

---

### POST `/api/learning/blocks/:blockId/complete`

Mark a block as completed and update lesson/milestone progress percentages.

**Response `200`:**
```json
{
  "message": "Block marked as completed",
  "lessonProgress": {
    "completionPercentage": 100,
    "isCompleted": true
  }
}
```

---

## 7. Other

| Method | Endpoint | isAuth | Priority |
|---|---|---|---|
| GET | `/api/languages` | Yes | HIGH |
| GET | `/api/languages/:languageId` | Yes | HIGH |
| POST | `/api/languages/select` | Yes | HIGH |
| GET | `/api/dashboard` | Yes | HIGH |

---

### GET `/api/languages`

Get all available languages.

**Response `200`:**
```json
[
  { "_id": "64f1a2b3c4d5e6f7a8b9c0d9", "language": "C++" },
  { "_id": "64f1a2b3c4d5e6f7a8b9c0da", "language": "Java" }
]
```

---

### GET `/api/languages/:languageId`

Get full info for a specific language (`c-plus-plus` or `java`).

**Response `200`:**
```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d9",
  "language": "C++",
  "info": "C++ is a general-purpose programming language created by Bjarne Stroustrup. It supports object-oriented, procedural, and generic programming styles."
}
```

---

### POST `/api/languages/select`

Set the primary learning language for the authenticated user's profile.

**Request Body:**
```json
{
  "language": "C++"
}
```

**Response `200`:**
```json
{
  "message": "Language updated successfully",
  "selectedLanguage": ["C++"]
}
```

---

### GET `/api/dashboard`

Get general dashboard summary for the authenticated user.

**Response `200`:**
```json
{
  "user": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "username": "alice",
    "selectedLanguage": ["C++"]
  },
  "roadmap": {
    "_id": "64f1a2b3c4d5e6f7a8b9c099",
    "title": "Lo trinh C++",
    "language": "C++"
  },
  "stats": {
    "totalLearnedLessons": 5,
    "totalCompletedExercises": 18,
    "overallProgress": 32,
    "weakTagsCount": 2
  },
  "milestones": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0a1",
      "title": "C++ Fundamentals",
      "status": "Active",
      "completionPercentage": 45
    },
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0a2",
      "title": "Object Oriented Programming",
      "status": "Locked",
      "completionPercentage": 0
    }
  ],
  "dailyReview": {
    "pendingCount": 8
  }
}
```
