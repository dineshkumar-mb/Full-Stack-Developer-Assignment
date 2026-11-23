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
- **Phase 4: Admin Authentication, Analytics & Management APIs** (Completed)
  - Objective: Admin login (`POST /api/admin/auth/login`), profile (`GET /api/admin/auth/me`), stateless logout instructions, admin authorization middleware (`requireAdmin` with active-account database verification), dashboard analytics (`/dashboard/summary` and `/dashboard/analytics`), question management CRUD with exact 10 active-question limit and atomic swap replacement, zero-N+1 candidate listing and search/filter/sort aggregation, candidate full assessment review, CSV and Excel (SpreadsheetML) exports with CWE-1236 spreadsheet formula injection sanitization, assessment settings management, and query performance indexing.
- **Phase 5: Frontend UI/UX Implementation** (Completed)
  - Objective: Complete Candidate Assessment Portal and Administrative Dashboard built with React 18, Vite 6, Tailwind CSS, React Hook Form, Zod, and Recharts. Includes candidate registration, test instructions, real-time assessment engine with server-authoritative countdown timer, autosave, 10-question palette, mark for review, auto-timeout submission, submission preview modal, performance result view, admin authentication, executive analytics dashboard, question bank with atomic active-slot swap modal, candidate transcript review, CSV & Excel (.xls) file exports, and system settings management. Fully tested with Vitest and React Testing Library (13/13 tests passing) alongside full backend regression test suite (104/104 tests passing).
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

## 6. Phase 4 Admin Module Architecture & API Specifications

### Admin Authentication & Authorization Workflow
- **Login (`POST /api/admin/auth/login`):** Validates email and password, verifies password with `bcrypt.compare()`, checks account active status, records `lastLogin`, and issues a signed JWT (`role: 'admin' | 'superadmin'`). Rate-limited to 20 attempts per 15 minutes.
- **Admin Verification Middleware (`requireAdmin`):** Verifies the JWT payload and confirms against the database that the administrator account exists and is active. Rejects candidate tokens with `403 Forbidden`.
- **Stateless Logout (`POST /api/admin/auth/logout`):** Instructs the client application to dispose of the JWT token from storage.

Seeded Administrator Credentials:
- **Email:** `admin@assessment.com`
- **Password:** `AdminPassword123!`

---

### Admin API Endpoints

#### 1. Authentication
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/admin/auth/login` | Authenticate admin & issue token | Public (Rate-limited) |
| `GET` | `/api/admin/auth/me` | Current authenticated admin profile | Admin Bearer Token |
| `POST` | `/api/admin/auth/logout` | Stateless logout acknowledgment | Admin Bearer Token |

#### 2. Dashboard Analytics
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/admin/dashboard/summary` | Key metrics (candidates, completed, pass rate, avg score, highest/lowest) | Admin Bearer Token |
| `GET` | `/api/admin/dashboard/analytics` | Chart-ready trends (completion, registration, pass/fail, score distribution, category performance) | Admin Bearer Token |

**Summary Metrics Formulation:**
- `totalCandidates`: Total registered candidates.
- `completedAssessments`: Count of finalized attempts (`status: 'completed' | 'timed_out'`).
- `inProgressAssessments`: Count of attempts with `status: 'in_progress'`.
- `notStartedCandidates`: Candidates without an attempt record.
- `averageScore`: Average net score across completed attempts.
- `passRate`: `(passedCandidates / completedAssessments) * 100`.
- `highestScore` & `lowestScore`: Extremes across completed net scores.

#### 3. Question Bank Management & Active Invariant
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/admin/questions` | List questions with pagination, search, category, difficulty, & status filters | Admin Bearer Token |
| `GET` | `/api/admin/questions/:id` | Retrieve single question details | Admin Bearer Token |
| `POST` | `/api/admin/questions` | Create question (max 10 active enforced) | Admin Bearer Token |
| `PATCH` | `/api/admin/questions/:id` | Update question fields | Admin Bearer Token |
| `PATCH` | `/api/admin/questions/:id/status` | Activate or deactivate question (supports `replacementQuestionId` swap) | Admin Bearer Token |
| `DELETE` | `/api/admin/questions/:id` | Delete question (blocks if active and <= 10, or if referenced in history) | Admin Bearer Token |

**Active Question Invariant & Concurrency Guard:**
- The assessment strictly requires exactly 10 active questions.
- A MongoDB unique partial index on `{ activeSlot: 1 }, { unique: true, partialFilterExpression: { isActive: true } }` physically prevents concurrent activations from exceeding 10 active questions.
- **Atomic Replacement / Swap:** When exactly 10 questions are active, an admin cannot deactivate a question into an invalid (< 10) state unless a `replacementQuestionId` is supplied in `PATCH /api/admin/questions/:id/status`, atomically swapping active status and slot assignment.
- **Auditability Protection:** Questions referenced by candidate attempts (`Attempt.questionSnapshots.questionId`) cannot be deleted, ensuring permanent historical audit integrity.

#### 4. Candidate Management & Assessment Review
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/admin/candidates` | Zero-N+1 paginated candidate list with search, filter, and score sorting | Admin Bearer Token |
| `GET` | `/api/admin/candidates/:id` | Retrieve safe candidate profile and assessment state | Admin Bearer Token |
| `GET` | `/api/admin/candidates/:id/assessment` | Full question-by-question review (options, answers, isCorrect, explanation) | Admin Bearer Token |

**Zero-N+1 Aggregation Pipeline:**
- Candidate listing joins attempts via an efficient MongoDB `$lookup` and `$facet` pipeline, returning candidate details, attempt status, net score, and pass/fail indicators in a single database query.
- For incomplete/in-progress assessments, the review endpoint returns `status: 'in_progress'` without leaking unfinished evaluation data.

#### 5. CSV and Excel Export (CWE-1236 Formula Injection Protection)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/admin/candidates/export/csv` | Download candidate report as RFC 4180 CSV | Admin Bearer Token |
| `GET` | `/api/admin/candidates/export/excel` | Download candidate report as SpreadsheetML XML (.xls) | Admin Bearer Token |

**Spreadsheet Formula Injection Sanitization (CWE-1236):**
- Candidate-supplied text fields (names, emails, qualifications, cities) that start with formula-triggering characters (`=`, `+`, `-`, `@`) are sanitized by prepending a single quote (`'`), neutralizing executable command risks in Microsoft Excel, Google Sheets, and LibreOffice Calc.
- Numeric metrics (scores, counts, percentages) are preserved as true numeric types (`<Data ss:Type="Number">` in Excel).

#### 6. Assessment Settings Management
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/admin/settings` | Retrieve current global singleton settings | Admin Bearer Token |
| `PATCH` | `/api/admin/settings` | Update test duration (5–180m), pass % (0–100), marks weights | Admin Bearer Token |

**Historical Attempt Immutability:**
- Settings updates mutate the singleton `Settings` document and record `updatedBy: adminId`.
- Existing attempts retain their original immutable `settingsSnapshot` captured at initialization; past durations and pass marks are never altered retroactively.

---

## 7. Database Performance & Indexing

| Collection | Index | Purpose |
|---|---|---|
| `admins` | `{ email: 1 }` (unique) | Fast admin lookup and uniqueness |
| `candidates` | `{ email: 1 }` (unique) | Unique candidate email enforcement |
| `candidates` | `{ fullName: 1 }` | Fast candidate name search |
| `candidates` | `{ createdAt: -1 }` | Candidate listing sort by registration date |
| `attempts` | `{ candidateId: 1 }` (unique) | One attempt per candidate invariant |
| `attempts` | `{ candidateEmail: 1 }` (unique) | Secondary candidate attempt guard |
| `attempts` | `{ status: 1, submittedAt: -1 }` | Fast dashboard queries and completion filtering |
| `attempts` | `{ 'scoreSummary.netScore': -1 }` | Candidate leaderboard & score sorting |
| `attempts` | `{ 'scoreSummary.isPassed': 1 }` | Pass/fail candidate filtering & analytics |
| `questions` | `{ activeSlot: 1 }` (unique, partial: `isActive: true`) | Concurrency guard ensuring strictly $\le 10$ active questions |
| `questions` | `{ category: 1 }`, `{ difficulty: 1 }`, `{ isActive: 1 }` | Question bank filtering |
| `questions` | `{ createdAt: -1 }` | Sorted question list pagination |
| `settings` | `{ singletonKey: 1 }` (unique) | Global singleton settings guard |

---

## 8. Testing Instructions

### Run the Full Test Suite
```bash
cd server
npm run test
```

**Test Suite Coverage (104 tests across 12 files):**
- `tests/models.test.js`: 15 tests (Admin, Candidate, Question, Settings, Attempt validations & activeSlot concurrency)
- `tests/authAndMiddleware.test.js`: 5 tests (Bcrypt, JWT verification, RBAC, error handlers)
- `tests/healthAndSeed.test.js`: 3 tests (Healthcheck, seeder idempotency, 4/3/3 question category distribution)
- `tests/candidateRegistrationAndAuth.test.js`: 10 tests (Registration, validation errors, duplicate email rejection, session restore)
- `tests/assessmentEngine.test.js`: 11 tests (Start, shuffle, DTO shielding, answer save, clear, timer expiry, 30s grace period, background worker)
- `tests/scoringEngine.test.js`: 8 tests (All scoring edge cases: 100%, 0%, negative marks, threshold pass/fail, server timestamps)
- `tests/timerBoundariesAndConcurrency.test.js`: 9 tests (Boundary checks: T-1ms, T, T+1ms, T+30s, T+30s+1ms, DB-level expiry guard, version increment, worker safety)
- `tests/adminAuth.test.js`: 10 tests (Login, case normalization, bad password/email, inactive admin, me, logout, candidate token rejection, expired token)
- `tests/adminDashboard.test.js`: 3 tests (Zeroed metrics on empty DB, summary calculation accuracy, chart-ready analytics datasets)
- `tests/adminQuestions.test.js`: 14 tests (CRUD, 10 active limit, deactivation block, atomic swap replacement, rollback on error, simultaneous race protection, slot 1-10 boundary enforcement, history snapshot immutability, delete blocks)
- `tests/adminCandidatesAndExport.test.js`: 8 tests (Zero-N+1 listing, search, isPassed filter, profile, review details, CSV export, Excel export, CWE-1236 sanitization)
- `tests/adminSettings.test.js`: 8 tests (Get, patch duration/pass %, range validation, reject unknown fields, candidate block, historical attempt snapshot immutability)
