# Aptitude Assessment Dashboard

A secure, full-stack corporate aptitude assessment platform built with the MERN stack (React, Node.js, Express, MongoDB). The system features a candidate assessment portal with timed execution, automatic timeout submission, negative marking, and answer persistence, as well as an administrative dashboard with question bank management, candidate performance analytics, search/filtering, and CSV data export.

---

## 1. AI-Assisted Development Documentation

This project is built using **Google Antigravity** as the primary AI coding and architecture system, adhering strictly to modern engineering standards, clean architecture, and test-driven methodology.

### Development Methodology & Phases
- **Phase 1: Project Analysis, Architecture & Initial Setup** (Completed)
  - Objective: Repository audit, full-stack architecture design, schema modeling, API contract definition, security planning, and clean boilerplate initialization.
- **Phase 2: Backend Development, Database Integration & Seed Data** (Completed)
  - Objective: Production-ready Express application (`app.js` & `server.js`), Mongoose schemas (`Admin`, `Settings`, `Question`, `Candidate`, `Attempt`), centralized error handling, JWT & bcrypt authentication foundation, idempotent database seeders (admin, settings, 10 corporate aptitude questions with 4/3/3 category distribution), and comprehensive automated Vitest test suite.
- **Phase 3: Candidate Assessment Engine & Server-Side Evaluation** (Completed)
  - Objective: Candidate registration & JWT authentication, profile/session recovery, assessment instructions, Fisher-Yates per-candidate question shuffling, immutable question snapshots, safe DTO delivery (masking `correctOption` & explanations), answer & review persistence, server-authoritative timer with 30s submission grace period, background & opportunistic auto-timeout worker, server-side scoring engine (+2, -1, 0, unattempted=0, negative scores allowed, scaledScoreOutOf10, isPassed), and result retrieval.
- **Phase 4: Admin Authentication, Analytics & Management** (Upcoming)
  - Objective: JWT + bcrypt auth, role-based middleware, analytics aggregation endpoints, candidate table with search/filtering, detail modal, CSV export, and settings management.
- **Phase 5: Frontend UI/UX Implementation** (Upcoming)
  - Objective: Candidate test interface (palette, timer, review flags, refresh survival, confirmation modal), responsive result view, admin dashboard (Recharts, tables, settings).
- **Phase 6: End-to-End Verification, Testing & Production Readiness** (Upcoming)
  - Objective: Vitest & Supertest automated test suite, security auditing, production build verification, and deployment guides.

### Key Prompts Used
- **Phase 1 Initiation Prompt:**
  > *"Act as a Senior Full Stack Architect, MERN Stack Developer, Database Architect, and Technical Lead. I am building an Aptitude Assessment Dashboard as part of a Full Stack Developer and AI Specialist coding assignment. The application must include: candidate registration, timed aptitude assessment with exactly 10 questions, automatic and manual test submission, negative marking and result calculation, secure admin authentication, admin analytics dashboard, question bank management, candidate performance management, CSV/Excel export, and configurable test duration and pass percentage... Inspect the complete existing project directory, design database architecture, API contracts, security plan, and initial setup without implementing business logic."*
- **Phase 2 Initiation Prompt:**
  > *"Act as a Senior Node.js Backend Engineer, MERN Stack Architect, MongoDB Database Engineer, and Application Security Specialist. We have completed Phase 1, which established the application architecture and technical specifications. Now implement Phase 2 of the Aptitude Assessment Dashboard: Express server configuration, MongoDB connection, Mongoose models (Admin, Settings, Question, Candidate, Attempt), database indexes, seed 10 corporate aptitude questions (4 Quantitative, 3 Logical Reasoning, 3 Verbal), seed admin, seed global settings, authentication foundation, centralized error handling, and automated tests."*
- **Phase 3 Initiation Prompt:**
  > *"Act as a Senior Backend Engineer and Assessment Platform Architect. Implement Phase 3 of the Aptitude Assessment Dashboard using the existing Phase 1 architecture and Phase 2 backend implementation: candidate registration, candidate authentication, candidate profile/session retrieval, assessment instructions, assessment initialization, per-candidate question shuffling, secure question delivery, answer persistence, mark-for-review persistence, assessment recovery after refresh, server-authoritative timer, manual submission, automatic timeout submission, server-side scoring and result calculation, candidate result retrieval, and candidate ownership and authorization protection."*

---

## 2. Technology Stack

### Backend (Phases 2 & 3)
- **Runtime:** Node.js (v22+)
- **Framework:** Express.js (v4) with ES Modules (`"type": "module"`)
- **Database & ODM:** MongoDB Atlas / Local MongoDB, Mongoose (v8)
- **Authentication & Security:** JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, Helmet, CORS, Express Rate Limit
- **Validation:** Zod schemas and Mongoose schema constraints
- **Logging:** Morgan
- **Testing:** Vitest, Supertest, `mongodb-memory-server`

### Frontend (Scaffolded in Phase 1)
- **Framework:** React.js (v18) with Vite (v6)
- **Language:** JavaScript (JSX)
- **Styling:** Tailwind CSS (v3), shadcn/ui design patterns
- **State & Routing:** React Router DOM (v6), React Hook Form, Zod
- **Icons & Visuals:** Lucide React, Recharts

---

## 3. Backend Architecture & Directory Structure

```text
server/
├── config/
│   ├── database.js               # MongoDB connection lifecycle, listeners, & getDBStatus()
│   └── environment.js            # Environment validation & fail-fast checks
├── controllers/
│   ├── candidateController.js    # Candidate registration & profile state handler
│   └── assessmentController.js   # Assessment start, current attempt, answer save, preview, submit, result
├── middleware/
│   ├── authMiddleware.js         # authenticateToken, requireAdmin, requireCandidate
│   ├── errorMiddleware.js        # Centralized error handler (Mongo 11000, ValidationError, JWT)
│   ├── notFoundMiddleware.js     # 404 Route Not Found handler
│   └── validateMiddleware.js     # Zod payload validation middleware
├── models/
│   ├── Admin.js                  # Admin schema with bcrypt password hashing & comparePassword()
│   ├── Attempt.js                # Assessment attempt schema with 10 question snapshots, version, scores
│   ├── Candidate.js              # Candidate profile schema with unique email & backward-compat aliases
│   ├── Question.js               # 4-option questions with activeSlot unique index concurrency guard
│   └── Settings.js               # Singleton global settings schema (duration, pass %, weights)
├── routes/
│   ├── healthRoutes.js           # GET /api/health reporting actual DB status
│   ├── candidateRoutes.js        # POST /register, GET /me
│   └── assessmentRoutes.js       # Instructions, start, current, save answer, preview, submit, result
├── services/
│   ├── assessmentService.js      # Core assessment lifecycle, shuffling, snapshotting, atomic submit
│   ├── scoringService.js         # Server-side grading engine (+2, -1, 0, netScore, %, pass/fail)
│   └── expiryService.js          # Background & periodic assessment auto-finalization scanner
├── seeders/
│   ├── seedAdmin.js              # Idempotent admin account creation
│   ├── seedAll.js                # Master seeder (admin + settings + questions)
│   ├── seedQuestions.js          # Exactly 10 corporate questions (4 Quant, 3 Logic, 3 Verbal)
│   └── seedSettings.js           # Idempotent settings seeder (15m, 60% pass, +2/-1)
├── utils/
│   ├── ApiError.js               # Custom operational error class with status codes
│   ├── asyncHandler.js           # Async route wrapper
│   ├── generateToken.js          # JWT sign, hashPassword, comparePassword helpers
│   ├── serializers.js            # DTO transformers ensuring private fields are never exposed
│   └── shuffle.js                # Cryptographically secure Fisher-Yates array shuffle
├── tests/
│   ├── setup.js                  # In-memory MongoMemoryServer lifecycle for hermetic testing
│   ├── models.test.js            # Model validations, unique indexes, active question limits
│   ├── authAndMiddleware.test.js # Bcrypt, JWT verification, RBAC, 404 & error handlers
│   ├── healthAndSeed.test.js     # /api/health and seeder idempotency & 4/3/3 distribution
│   ├── candidateRegistrationAndAuth.test.js # Candidate register, validation, resume, tokens
│   ├── assessmentEngine.test.js  # Test start, delivery, shuffle, answer save, preview, submit, recovery
│   └── scoringEngine.test.js     # Exact score cases, negative scores, rounding, threshold edge cases
├── app.js                        # Express app configuration & middleware pipeline
├── server.js                     # Server listener with graceful shutdown & background expiry worker
├── package.json
└── .env.example
```

---

## 4. Phase 3 Candidate Engine Workflow & Architecture

### 1. Registration & Authentication
- Candidates register via `POST /api/candidates/register` with:
  `fullName`, `email`, `age`, `phone` (or `phoneNumber`), `gender`, `qualification` (or `highestQualification`), `city`.
- Normalized lowercase `email` is indexed with a MongoDB unique constraint.
- If a candidate with that email has already completed an assessment, the request is rejected with `409 Conflict`.
- If a candidate registered previously but has not completed the assessment, their valid session token is reissued so they can resume without creating a duplicate record.
- Issues a scoped JWT token (`role: 'candidate'`) signed by `JWT_SECRET`. Candidate tokens cannot access admin routes.

### 2. Assessment Initialization & Question Snapshots
- Initiated via `POST /api/assessment/start` (requires candidate JWT).
- Verifies that exactly 10 active questions exist in the database (rejects with 400 otherwise).
- Randomly shuffles the 10 questions per candidate using a cryptographically secure Fisher-Yates shuffle (`server/utils/shuffle.js`).
- Creates immutable question snapshots inside the `Attempt` document. Subsequent modifications or deletions of questions by administrators never alter active or historical candidate attempts.
- Sets `startedAt` and server-calculated `expiresAt = startedAt + durationMinutes * 60000`.

### 3. Answer Persistence & Refresh Recovery
- Candidate answers and review flags are updated in real-time via `PATCH /api/assessment/attempt/questions/:questionSnapshotId`.
- Candidates can change options or clear an answer by sending `null`.
- If the browser is refreshed or disconnected, calling `GET /api/assessment/attempt/current` returns the exact same attempt with questions in their assigned stable shuffled order, saved answers, marked-for-review flags, and remaining seconds calculated from `expiresAt`.

### 4. Server-Authoritative Timer & 30-Second Grace Period
- Browser countdowns are strictly visual mirrors. The backend evaluates `expiresAt` on every operation.
- **Answer Modification Cutoff:** Answer updates (`PATCH`) are rejected immediately when `now > expiresAt`.
- **30-Second Submission Grace Period:** Candidates may submit their assessment up to 30 seconds after `expiresAt` to accommodate network latency, but answers cannot be altered during this window.
- **Automatic Finalization:** After `expiresAt + 30 seconds`, overdue attempts are automatically finalized with `submissionType: 'auto_timeout'` either by the background scanner (`server/services/expiryService.js`) or opportunistically when accessed.

### 5. Server-Side Scoring Formula & Evaluation Engine
All scoring is computed exclusively on the backend in `server/services/scoringService.js`:

| Question Outcome | Points |
|---|---|
| Correct Answer | **+2 marks** |
| Incorrect Answer | **−1 mark** |
| Unanswered Question | **0 marks** |

#### Formulas:
$$\text{marksGained} = \text{correctCount} \times 2$$
$$\text{marksDeducted} = \text{incorrectCount} \times 1$$
$$\text{netScore} = \text{marksGained} - \text{marksDeducted}$$
$$\text{scaledScoreOutOf10} = \frac{\text{netScore}}{2}$$
$$\text{percentage} = \left(\frac{\text{netScore}}{20}\right) \times 100$$
$$\text{isPassed} = \text{percentage} \ge \text{passPercentage}$$

#### Worked Examples:
1. **7 Correct, 2 Incorrect, 1 Unanswered:**
   - Marks Gained: $7 \times 2 = 14$
   - Marks Deducted: $2 \times 1 = 2$
   - Net Score: $14 - 2 = 12\text{ marks}$
   - Scaled Score: $12 / 2 = 6.0\text{ out of }10$
   - Percentage: $(12 / 20) \times 100 = 60.0\%$
   - Pass Status: **PASSED** (cut-off: 60%)
2. **1 Correct, 9 Incorrect, 0 Unanswered:**
   - Marks Gained: $1 \times 2 = 2$
   - Marks Deducted: $9 \times 1 = 9$
   - Net Score: $2 - 9 = -7\text{ marks}$ (negative scores are preserved and never clamped to 0)
   - Scaled Score: $-7 / 2 = -3.5\text{ out of }10$
   - Percentage: $(-7 / 20) \times 100 = -35.0\%$
   - Pass Status: **FAILED**

---

## 5. Phase 3 API Endpoint Specifications

### Candidate Routes

#### 1. `POST /api/candidates/register`
- **Auth:** None (Public)
- **Request Body:**
  ```json
  {
    "fullName": "John Smith",
    "email": "john@example.com",
    "age": 25,
    "phone": "9876543210",
    "gender": "Male",
    "qualification": "Bachelor's Degree",
    "city": "Chennai"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Candidate registered successfully.",
    "candidate": {
      "id": "673cf...",
      "fullName": "John Smith",
      "email": "john@example.com",
      "age": 25,
      "phone": "9876543210",
      "gender": "Male",
      "qualification": "Bachelor's Degree",
      "city": "Chennai",
      "hasAttempted": false,
      "attemptId": null
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
  ```

#### 2. `GET /api/candidates/me`
- **Auth:** Candidate Bearer Token
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "candidate": {
      "id": "673cf...",
      "fullName": "John Smith",
      "email": "john@example.com",
      "hasRegistered": true,
      "hasStarted": true,
      "hasAttemptInProgress": true,
      "hasCompleted": false,
      "attemptId": "673d0...",
      "attemptStatus": "in_progress"
    }
  }
  ```

---

### Assessment Routes

#### 3. `GET /api/assessment/instructions`
- **Auth:** None / Candidate
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "instructions": {
      "totalQuestions": 10,
      "durationMinutes": 15,
      "correctMarkWeight": 2,
      "negativeMarkWeight": 1,
      "unattemptedMark": 0,
      "passPercentage": 60,
      "rules": [...]
    }
  }
  ```

#### 4. `POST /api/assessment/start`
- **Auth:** Candidate Bearer Token
- **Response (201 Created / 200 OK):**
  ```json
  {
    "success": true,
    "message": "Assessment started successfully",
    "attempt": {
      "attemptId": "673d0...",
      "status": "in_progress",
      "startedAt": "2026-11-23T15:00:00.000Z",
      "expiresAt": "2026-11-23T15:15:00.000Z",
      "serverNow": "2026-11-23T15:00:00.000Z",
      "remainingSeconds": 900,
      "durationMinutes": 15,
      "totalQuestions": 10,
      "answeredCount": 0,
      "unansweredCount": 10,
      "markedForReviewCount": 0,
      "questions": [
        {
          "snapshotId": "673d0a...",
          "questionId": "673cf1...",
          "orderNumber": 1,
          "questionText": "A subscription business plans a 20% price increase...",
          "options": [
            { "optionId": "A", "text": "16.7%" },
            { "optionId": "B", "text": "20%" },
            { "optionId": "C", "text": "15%" },
            { "optionId": "D", "text": "18.3%" }
          ],
          "category": "Quantitative",
          "difficulty": "Medium",
          "selectedOption": null,
          "isMarkedForReview": false,
          "isAnswered": false
        }
      ]
    }
  }
  ```

#### 5. `GET /api/assessment/attempt/current`
- **Auth:** Candidate Bearer Token
- **Response (200 OK):** Returns the current serialized attempt with updated answers and remaining seconds.

#### 6. `PATCH /api/assessment/attempt/questions/:questionSnapshotId`
- **Auth:** Candidate Bearer Token
- **Request Body:**
  ```json
  {
    "selectedOption": "B",
    "isMarkedForReview": true
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Answer updated successfully",
    "question": {
      "snapshotId": "673d0a...",
      "questionId": "673cf1...",
      "orderNumber": 1,
      "selectedOption": "B",
      "isMarkedForReview": true,
      "isAnswered": true
    }
  }
  ```

#### 7. `GET /api/assessment/attempt/submission-preview`
- **Auth:** Candidate Bearer Token
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "preview": {
      "totalQuestions": 10,
      "answeredCount": 8,
      "unansweredCount": 2,
      "markedForReviewCount": 1,
      "status": "in_progress",
      "isExpired": false
    }
  }
  ```

#### 8. `POST /api/assessment/attempt/submit`
- **Auth:** Candidate Bearer Token
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Assessment submitted successfully.",
    "result": {
      "attemptId": "673d0...",
      "candidate": {
        "id": "673cf...",
        "fullName": "John Smith",
        "email": "john@example.com"
      },
      "scoreSummary": {
        "totalQuestions": 10,
        "correctCount": 7,
        "incorrectCount": 2,
        "unattemptedCount": 1,
        "marksGained": 14,
        "marksDeducted": 2,
        "netScore": 12,
        "scaledScoreOutOf10": 6,
        "percentage": 60,
        "passPercentageCutoff": 60,
        "isPassed": true,
        "timeTakenSeconds": 540,
        "submissionType": "manual",
        "startedAt": "2026-11-23T15:00:00.000Z",
        "submittedAt": "2026-11-23T15:09:00.000Z"
      }
    }
  }
  ```

#### 9. `GET /api/assessment/result`
- **Auth:** Candidate Bearer Token
- **Response (200 OK):** Returns final score summary. Returns `400 Bad Request` if assessment is still in progress.

---

## 6. Testing Instructions

### Run the Full Test Suite
```bash
cd server
npm run test
```
**Current Test Results (52 tests across 6 files):**
- `tests/models.test.js`: 15 tests (Admin, Candidate, Question, Settings, Attempt validations & activeSlot concurrency)
- `tests/authAndMiddleware.test.js`: 5 tests (Bcrypt, JWT verification, RBAC, error handlers)
- `tests/healthAndSeed.test.js`: 3 tests (Healthcheck, seeder idempotency, 4/3/3 question category distribution)
- `tests/candidateRegistrationAndAuth.test.js`: 10 tests (Registration, validation errors, duplicate email rejection, session restore)
- `tests/assessmentEngine.test.js`: 11 tests (Start, shuffle, DTO shielding, answer save, clear, timer expiry, 30s grace period, background worker)
- `tests/scoringEngine.test.js`: 8 tests (All scoring edge cases: 100%, 0%, negative marks, threshold pass/fail, server timestamps)
