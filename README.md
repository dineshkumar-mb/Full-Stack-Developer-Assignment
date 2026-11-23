# Aptitude Assessment Dashboard

A secure, full-stack corporate aptitude assessment platform built with the MERN stack (React, Node.js, Express, MongoDB). The system features a candidate assessment portal with timed execution, automatic timeout submission, negative marking, and answer persistence, as well as an administrative dashboard with question bank management, candidate performance analytics, search/filtering, and CSV data export.

---

## 1. AI-Assisted Development Documentation

This project is built using **Google Antigravity** as the primary AI coding and architecture system, adhering strictly to modern engineering standards, clean architecture, and test-driven methodology.

### Development Methodology & Phases
- **Phase 1: Project Analysis, Architecture & Initial Setup** (Current)
  - Objective: Repository audit, full-stack architecture design, schema modeling, API contract definition, security planning, and clean boilerplate initialization.
- **Phase 2: Database Models & Question Bank Management**
  - Objective: Mongoose schema implementation, validation constraints, data seeders (10 corporate-level questions across Quantitative, Logical Reasoning, and Verbal), and question CRUD APIs.
- **Phase 3: Candidate Assessment Engine & Server-Side Evaluation**
  - Objective: Registration validation, attempt session management, server-authoritative timer, auto/manual submission, negative marking calculation, and answer shielding.
- **Phase 4: Admin Authentication, Analytics & Management**
  - Objective: JWT + bcrypt auth, role-based middleware, analytics aggregation endpoints, candidate table with search/filtering, detail modal, CSV export, and settings management.
- **Phase 5: Frontend UI/UX Implementation**
  - Objective: Candidate test interface (palette, timer, review flags, refresh survival, confirmation modal), responsive result view, admin dashboard (Recharts, tables, settings).
- **Phase 6: End-to-End Verification, Testing & Production Readiness**
  - Objective: Vitest & Supertest automated test suite, security auditing, production build verification, and deployment guides.

### Key Prompts Used
- **Phase 1 Initiation Prompt:**
  > *"Act as a Senior Full Stack Architect, MERN Stack Developer, Database Architect, and Technical Lead. I am building an Aptitude Assessment Dashboard as part of a Full Stack Developer and AI Specialist coding assignment. The application must include: candidate registration, timed aptitude assessment with exactly 10 questions, automatic and manual test submission, negative marking and result calculation, secure admin authentication, admin analytics dashboard, question bank management, candidate performance management, CSV/Excel export, and configurable test duration and pass percentage... Inspect the complete existing project directory, design database architecture, API contracts, security plan, and initial setup without implementing business logic."*

### Architectural Decisions
1. **Server-Authoritative Evaluation & Timing:** Question answers (`correctOption`) are never transmitted to the client. Assessment expiration is computed and enforced on the backend (`startedAt + durationMinutes + gracePeriod`). Scoring and negative marking are executed exclusively on the server.
2. **Attempt Snapshots:** Questions and candidate responses are permanently frozen into the `Attempt` record at assessment initiation and submission. Changes to the question bank or candidate profile never corrupt historical test attempts.
3. **Strict Invariant Enforcement:** The database and API enforce that a test cannot begin unless exactly 10 active questions exist in the database, and the question bank cannot hold more than 10 active questions.
4. **Data Isolation & Duplicate Prevention:** Compound database indexes on candidate email and attempt candidate ID prevent multi-attempt abuse and race conditions.

### Assumptions
- **Scoring Scale:** Each correct answer earns +2 marks, each incorrect answer deducts -1 mark, and unattempted questions earn 0 marks. Across 10 questions, the maximum raw score is 20 marks, with a scaled score out of 10 (`rawScore / 2`) displayed alongside the percentage `(netScore / 20) * 100`.
- **Question Distribution:** The question bank consists of 10 corporate-level aptitude questions with at least 3 questions per category (Quantitative, Logical Reasoning, Verbal).
- **Default Cutoff:** Default test duration is 15 minutes and pass percentage is 60%, fully configurable in the database via the admin settings panel.

---

## 2. Technology Stack

### Frontend
- **Framework:** React.js (v18) with Vite
- **Language:** JavaScript (JSX)
- **Styling & Components:** Tailwind CSS (v3), shadcn/ui design patterns
- **Routing:** React Router DOM (v6)
- **HTTP Client:** Axios
- **Form Management & Validation:** React Hook Form, Zod, `@hookform/resolvers`
- **Data Visualization:** Recharts
- **Icons:** Lucide React

### Backend
- **Runtime & Framework:** Node.js (v22+), Express.js (v4)
- **Database & ODM:** MongoDB Atlas / Local MongoDB, Mongoose (v8)
- **Authentication & Security:** JSON Web Tokens (JWT), bcryptjs, Helmet, CORS, Express Rate Limit
- **Validation:** Zod schemas
- **Exporting:** `csv-writer`
- **Logging:** Morgan

### Testing & Tooling
- **Testing:** Vitest, Supertest
- **Process Management:** Nodemon

### Deployment Targets
- **Frontend:** Vercel
- **Backend:** Render
- **Database:** MongoDB Atlas

---

## 3. Directory Structure

```text
aptitude-assessment/
├── client/                               # Frontend React + Vite application
│   ├── public/                           # Static assets
│   ├── src/
│   │   ├── assets/                       # Images, logos, icons
│   │   ├── components/                   # Reusable UI components (buttons, modals, cards)
│   │   │   └── ui/                       # shadcn/ui components
│   │   ├── pages/
│   │   │   ├── candidate/                # Registration, Instructions, Assessment, Result
│   │   │   └── admin/                    # Login, Dashboard, Questions, Candidates, Settings
│   │   ├── layouts/                      # Candidate & Admin layout shells
│   │   ├── hooks/                        # Custom React hooks (e.g. useTimer, useAuth)
│   │   ├── context/                      # AuthContext, AssessmentContext
│   │   ├── services/                     # Axios API clients
│   │   ├── utils/                        # Formatting, cn() class merger, storage helpers
│   │   ├── routes/                       # Protected & public route definitions
│   │   ├── App.jsx                       # Root router configuration
│   │   ├── main.jsx                      # Vite entry point
│   │   └── index.css                     # Tailwind CSS and theme variables
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                               # Backend Node.js + Express API
│   ├── config/                           # Database connection & env validation
│   ├── controllers/                      # Request handlers (candidate, admin, questions)
│   ├── middleware/                       # Auth verification, rate limiting, error handling
│   ├── models/                           # Mongoose schemas (Admin, Candidate, Question, Attempt, Settings)
│   ├── routes/                           # API route definitions
│   ├── services/                         # Scoring engine, analytics, CSV generator
│   ├── validators/                       # Zod request payload schemas
│   ├── seeders/                          # Database seeder (admin user & 10 aptitude questions)
│   ├── utils/                            # JWT helpers, response formatters, logger
│   ├── tests/                            # Vitest & Supertest integration tests
│   ├── .env.example
│   ├── package.json
│   └── server.js                         # Express application entry point
│
├── README.md                             # Project documentation & architecture
└── .gitignore                            # Git exclusion rules
```

---

## 4. Database Architecture & Schema Specification

The database utilizes 5 primary collections in MongoDB:

### 1. `admins`
Stores administrative user accounts with encrypted credentials.
- `_id`: ObjectId
- `name`: String (2-50 chars, required)
- `email`: String (lowercase, unique index, required)
- `passwordHash`: String (bcrypt hash, 10 rounds, required)
- `role`: String (enum: `['admin', 'superadmin']`, default: `'admin'`)
- `isActive`: Boolean (default: `true`)
- `lastLogin`: Date (nullable)
- `createdAt`, `updatedAt`: Timestamps

### 2. `settings`
Global test configuration (singleton record pattern).
- `_id`: ObjectId
- `testDurationMinutes`: Number (min: 5, max: 180, default: `15`, required)
- `passPercentage`: Number (min: 1, max: 100, default: `60`, required)
- `correctMarkWeight`: Number (default: `2`, required)
- `negativeMarkWeight`: Number (default: `1`, required)
- `totalTestQuestions`: Number (default: `10`, required)
- `updatedBy`: ObjectId (ref: `'Admin'`, nullable)
- `createdAt`, `updatedAt`: Timestamps

### 3. `questions`
Question bank repository.
- `_id`: ObjectId
- `questionText`: String (10-1000 chars, required)
- `options`: Array of 4 items:
  - `optionId`: String (enum: `['A', 'B', 'C', 'D']`, required)
  - `text`: String (1-500 chars, required)
- `correctOption`: String (enum: `['A', 'B', 'C', 'D']`, required) - *Never exposed to candidates*
- `category`: String (enum: `['Quantitative', 'Logical Reasoning', 'Verbal']`, required)
- `difficulty`: String (enum: `['Easy', 'Medium', 'Hard']`, required)
- `explanation`: String (optional)
- `isActive`: Boolean (default: `true`)
- `createdAt`, `updatedAt`: Timestamps
- *Validation Invariant:* Maximum 10 active questions permitted in the system. Minimum 10 active questions required to initiate any candidate test.

### 4. `candidates`
Stores candidate registration details before taking the test.
- `_id`: ObjectId
- `fullName`: String (2-50 chars, alphabetic & spaces only, required)
- `email`: String (lowercase, unique index, required) - *Enforces one attempt per email*
- `age`: Number (integer, 18-60, required)
- `phoneNumber`: String (10 numeric digits, required)
- `gender`: String (enum: `['Male', 'Female', 'Non-Binary', 'Prefer not to say', 'Other', '']`)
- `highestQualification`: String (enum: `['High School', 'Diploma', "Bachelor's Degree", "Master's Degree", 'Doctorate', 'Other']`, required)
- `city`: String (max 50 chars, optional)
- `hasAttempted`: Boolean (default: `false`)
- `attemptId`: ObjectId (ref: `'Attempt'`, nullable)
- `createdAt`, `updatedAt`: Timestamps

### 5. `attempts`
Complete test attempt record with frozen question snapshots and evaluated scores.
- `_id`: ObjectId
- `candidateId`: ObjectId (ref: `'Candidate'`, unique index, required)
- `candidateEmail`: String (lowercase, unique index, required)
- `candidateSnapshot`: Object (name, email, phone, age, qualification)
- `status`: String (enum: `['in_progress', 'completed', 'timed_out']`, default: `'in_progress'`)
- `startedAt`: Date (required, default: `Date.now`)
- `expiresAt`: Date (required, server calculated: `startedAt + durationMinutes * 60 * 1000`)
- `submittedAt`: Date (nullable)
- `submissionType`: String (enum: `['manual', 'auto_timeout']`, nullable)
- `questionSnapshots`: Array of 10 items (shuffled order per candidate):
  - `questionId`: ObjectId (ref: `'Question'`)
  - `orderNumber`: Number (1 to 10)
  - `questionText`: String
  - `options`: `[{ optionId, text }]`
  - `correctOption`: String
  - `category`: String
  - `difficulty`: String
  - `candidateAnswer`: String (`'A'` | `'B'` | `'C'` | `'D'` | `null`)
  - `isMarkedForReview`: Boolean (default: `false`)
  - `isCorrect`: Boolean (nullable)
  - `answeredAt`: Date (nullable)
- `scoreSummary`:
  - `totalQuestions`: Number (10)
  - `correctCount`: Number
  - `incorrectCount`: Number
  - `unattemptedCount`: Number
  - `marksGained`: Number (`correctCount * 2`)
  - `marksDeducted`: Number (`incorrectCount * 1`)
  - `netScore`: Number (`marksGained - marksDeducted`)
  - `scaledScoreOutOf10`: Number (`netScore / 2`)
  - `percentage`: Number (`(netScore / 20) * 100`)
  - `passPercentageCutoff`: Number (snapshot of settings)
  - `isPassed`: Boolean
  - `timeTakenSeconds`: Number
- `createdAt`, `updatedAt`: Timestamps

---

## 5. API Endpoint Specifications

### Candidate Endpoints
| Method | Endpoint | Purpose | Auth | Request Body | Response (200/201) |
|---|---|---|---|---|---|
| `POST` | `/api/candidate/register` | Register candidate & validate unique email | None | `{ fullName, email, age, phoneNumber, gender?, highestQualification, city? }` | `{ success, candidateId, token, message }` |
| `GET` | `/api/candidate/instructions` | Fetch test parameters (duration, marking scheme) | Candidate Token | None | `{ durationMinutes, totalQuestions, correctMark, negativeMark, passPercentage }` |
| `POST` | `/api/candidate/start-test` | Initialize attempt, freeze 10 questions, start timer | Candidate Token | None | `{ attemptId, startedAt, expiresAt, totalQuestions }` |
| `GET` | `/api/candidate/questions` | Fetch questions without answers + saved answers | Candidate Token | None | `{ questions: [...], expiresAt, remainingSeconds }` |
| `PATCH` | `/api/candidate/save-answer` | Save/update answer or review flag in real-time | Candidate Token | `{ questionId, candidateAnswer, isMarkedForReview }` | `{ success, updatedQuestionId, answeredCount, unansweredCount }` |
| `POST` | `/api/candidate/submit-test` | Finalize submission & grade test on server | Candidate Token | `{ submissionType: 'manual' \| 'auto_timeout' }` | `{ success, attemptId, scoreSummary }` |
| `GET` | `/api/candidate/result` | Retrieve candidate final test score and status | Candidate Token | None | `{ candidate, scoreSummary }` |

### Admin Endpoints
| Method | Endpoint | Purpose | Auth | Request Body | Response (200/201) |
|---|---|---|---|---|---|
| `POST` | `/api/admin/login` | Admin authentication & JWT issue | None | `{ email, password }` | `{ success, token, admin: { id, name, email } }` |
| `POST` | `/api/admin/logout` | Invalidate admin session | Admin JWT | None | `{ success, message }` |
| `GET` | `/api/admin/analytics/dashboard` | KPI cards and Recharts analytics summary | Admin JWT | None | `{ totalRegistered, testsCompleted, averageScore, passRate, highestScore, distribution, passFailSplit }` |
| `GET` | `/api/admin/questions` | List all questions in bank with correct options | Admin JWT | None | `{ total, activeCount, questions: [...] }` |
| `POST` | `/api/admin/questions` | Create question (enforces max 10 active rule) | Admin JWT | `{ questionText, options, correctOption, category, difficulty }` | `{ success, question }` |
| `PUT` | `/api/admin/questions/:id` | Update question details or status | Admin JWT | `{ questionText, options, correctOption, category, difficulty, isActive }` | `{ success, question }` |
| `DELETE` | `/api/admin/questions/:id` | Remove question from bank | Admin JWT | None | `{ success, message }` |
| `GET` | `/api/admin/candidates` | Paginated candidate results table | Admin JWT | Query: `?page=1&limit=10&search=&status=&sortBy=&sortOrder=` | `{ candidates: [...], pagination: { total, page, totalPages } }` |
| `GET` | `/api/admin/candidates/:id` | Candidate attempt detail view with question review | Admin JWT | None | `{ candidate, attempt, questionReview: [...] }` |
| `GET` | `/api/admin/candidates/export` | Export candidates and scores to CSV | Admin JWT | Query: `?search=&status=&format=csv` | `Content-Type: text/csv` file download |
| `GET` | `/api/admin/settings` | Retrieve test duration and cut-off percentage | Admin JWT | None | `{ testDurationMinutes, passPercentage, correctMarkWeight, negativeMarkWeight }` |
| `PUT` | `/api/admin/settings` | Update test duration and cut-off percentage | Admin JWT | `{ testDurationMinutes, passPercentage }` | `{ success, settings }` |

---

## 6. Security Architecture

1. **Password Security:** Admin passwords hashed using `bcryptjs` with 10 salt rounds. Plaintext passwords are never logged or stored.
2. **JWT Authorization:** Stateless Bearer tokens signed with HMAC-SHA256. Admin tokens expire in 8 hours. Candidate tokens are scoped strictly to the duration of the test.
3. **Correct Answer Shielding:** The candidate-facing API (`GET /api/candidate/questions`) uses Mongoose projection exclusion (`-correctOption -explanation`) to ensure answers are never transmitted to the browser network tab.
4. **Server-Authoritative Evaluation:** All answer evaluation, negative marking (-1), correct score calculation (+2), and pass/fail statuses are computed on the backend.
5. **Server-Side Expiration Enforcement:** The server verifies `expiresAt` on every answer save and submission request. Submissions past the expiration time are processed with `auto_timeout`.
6. **Duplicate Submission Protection:** Atomic update queries with status checks (`status === 'in_progress'`) guarantee that an assessment cannot be submitted twice.
7. **Database-Level Unique Constraints:** MongoDB unique indexes on `email` in both `candidates` and `attempts` collections prevent race conditions and enforce one attempt per candidate.
8. **Rate Limiting & Security Headers:** `express-rate-limit` prevents brute-force login and registration abuse; `helmet` enforces secure HTTP response headers.

---

## 7. Setup and Run Instructions

### Prerequisites
- Node.js v18+ (tested on v22.17.0)
- MongoDB instance (MongoDB Atlas connection string or local MongoDB running on `mongodb://localhost:27017`)

### 1. Backend Setup
```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### 2. Frontend Setup
```bash
cd client
cp .env.example .env
npm install
npm run dev
```

### 3. Default Admin Credentials (Seeded in Phase 2)
- **Email:** `admin@assessment.com`
- **Password:** `AdminPassword123!`
