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
- **Phase 3: Candidate Assessment Engine & Server-Side Evaluation** (Upcoming)
  - Objective: Registration validation, attempt session management, server-authoritative timer, auto/manual submission, negative marking calculation, and answer shielding.
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

---

## 2. Technology Stack

### Backend (Phase 2 Focus)
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
├── controllers/                  # Handlers for candidate, admin, questions (Phases 3 & 4)
├── middleware/
│   ├── authMiddleware.js         # authenticateToken, requireAdmin, requireCandidate
│   ├── errorMiddleware.js        # Centralized error handler (Mongo 11000, ValidationError, JWT)
│   ├── notFoundMiddleware.js     # 404 Route Not Found handler
│   └── validateMiddleware.js     # Zod payload validation middleware
├── models/
│   ├── Admin.js                  # Admin schema with bcrypt password hashing & comparePassword()
│   ├── Attempt.js                # Assessment attempt schema with 10 question snapshots & scores
│   ├── Candidate.js              # Candidate profile schema with unique email constraint
│   ├── Question.js               # 4-option questions with max 10 active constraint & pre-save hook
│   └── Settings.js               # Singleton global settings schema (duration, pass %, weights)
├── routes/
│   └── healthRoutes.js           # GET /api/health reporting actual DB status
├── seeders/
│   ├── seedAdmin.js              # Idempotent admin account creation
│   ├── seedAll.js                # Master seeder (admin + settings + questions)
│   ├── seedQuestions.js          # Exactly 10 corporate questions (4 Quant, 3 Logic, 3 Verbal)
│   └── seedSettings.js           # Idempotent settings seeder (15m, 60% pass, +2/-1)
├── utils/
│   ├── ApiError.js               # Custom operational error class with status codes
│   ├── asyncHandler.js           # Async route wrapper
│   └── generateToken.js          # JWT sign, hashPassword, comparePassword helpers
├── tests/
│   ├── setup.js                  # In-memory MongoMemoryServer lifecycle for hermetic testing
│   ├── models.test.js            # Model validations, unique indexes, active question limits
│   ├── authAndMiddleware.test.js # Bcrypt, JWT verification, RBAC, 404 & error handlers
│   └── healthAndSeed.test.js     # /api/health and seeder idempotency & 4/3/3 distribution
├── app.js                        # Express app configuration & middleware pipeline
├── server.js                     # Server listener with graceful shutdown & DB startup check
├── package.json
└── .env.example
```

---

## 4. Database Collections & Indexes

### 1. `admins`
- **Fields:** `name`, `email`, `passwordHash`, `role` (`admin` | `superadmin`), `isActive`, `lastLogin`, `timestamps`.
- **Indexes:** `email: 1` (unique).
- **Security:** `passwordHash` is excluded from JSON serialization.

### 2. `settings`
- **Fields:** `singletonKey`, `testDurationMinutes` (5–180), `passPercentage` (1–100), `correctMarkWeight` (positive), `negativeMarkWeight` (non-negative), `totalTestQuestions` (exactly 10), `updatedBy`, `timestamps`.
- **Indexes:** `singletonKey: 1` (unique).

### 3. `questions`
- **Fields:** `seedId`, `questionText`, `options` (exactly 4: `optionId` A, B, C, D with non-empty text), `correctOption` (A, B, C, D), `category` (`Quantitative`, `Logical Reasoning`, `Verbal`), `difficulty` (`Easy`, `Medium`, `Hard`), `explanation`, `isActive`, `timestamps`.
- **Indexes:** `seedId: 1` (unique, sparse), `category: 1`, `difficulty: 1`, `isActive: 1`.
- **Business Invariant:** Enforced max 10 active questions via Mongoose pre-save hook and capacity validation.

### 4. `candidates`
- **Fields:** `fullName` (letters & spaces only, 2–50 chars), `email` (lowercase, unique index), `age` (18–60), `phoneNumber` (10 digits), `gender`, `highestQualification`, `city`, `hasAttempted`, `attemptId`, `timestamps`.
- **Indexes:** `email: 1` (unique), `fullName: 1`.

### 5. `attempts`
- **Fields:** `candidateId` (unique ref), `candidateEmail` (unique), `candidateSnapshot`, `status` (`in_progress`, `completed`, `timed_out`), `startedAt`, `expiresAt`, `submittedAt`, `submissionType`, `questionSnapshots` (exactly 10 frozen questions), `scoreSummary`, `settingsSnapshot`, `timestamps`.
- **Indexes:** `candidateId: 1` (unique), `candidateEmail: 1` (unique), `status: 1`, `submittedAt: -1`.

---

## 5. Seed Data Summary (10 Corporate Aptitude Questions)

The system includes 10 corporate questions (3 original assignment samples + 7 original corporate questions):

| # | Seed ID | Category | Difficulty | Concept / Topic | Correct Option |
|---|---|---|---|---|---|
| 1 | `SEED_Q_QUANT_01` | Quantitative | Medium | Subscription revenue price increase vs allowable churn (Sample 1) | **A (16.7%)** |
| 2 | `SEED_Q_LOGIC_01` | Logical Reasoning | Hard | 6-meeting Monday-to-Saturday schedule deduction (Sample 2) | **B (Q is on Saturday)** |
| 3 | `SEED_Q_VERBAL_01` | Verbal | Medium | Subject-verb agreement with correlative conjunctions (Sample 3) | **C (analysts... were)** |
| 4 | `SEED_Q_QUANT_02` | Quantitative | Easy | SaaS CAC payback period calculation | **B (10 months)** |
| 5 | `SEED_Q_QUANT_03` | Quantitative | Medium | Consultant capacity & resource reallocation timeline | **B (16 days)** |
| 6 | `SEED_Q_QUANT_04` | Quantitative | Hard | Multi-division revenue growth & decline system of equations | **B ($12.0 million)** |
| 7 | `SEED_Q_LOGIC_02` | Logical Reasoning | Easy | Deductive contrapositive & compliance categorization | **A (Helios not high-performing)** |
| 8 | `SEED_Q_LOGIC_03` | Logical Reasoning | Medium | Sequential enterprise deployment dependency puzzle | **B (CRM is second)** |
| 9 | `SEED_Q_VERBAL_02` | Verbal | Easy | Parallel grammatical structures in performance reviews | **C (auditing, designing, overseeing)** |
| 10 | `SEED_Q_VERBAL_03` | Verbal | Hard | Elimination of redundancy and syntactic ambiguity | **B (concise committee rollout)** |

**Category Distribution:** Quantitative = 4, Logical Reasoning = 3, Verbal = 3 (Total: 10).

---

## 6. Environment Configuration

Create a `.env` file in `server/`:

```env
NODE_ENV=development
PORT=5000

# MongoDB Connection String (MongoDB Atlas or local MongoDB)
MONGODB_URI=mongodb://localhost:27017/aptitude_assessment

# JWT Secret & Expiration
JWT_SECRET=replace_with_a_secure_jwt_secret_in_production
JWT_EXPIRES_IN=1d

# Frontend Client URL for CORS
CLIENT_URL=http://localhost:5173

# Admin Seed Account
ADMIN_NAME=Assessment Administrator
ADMIN_EMAIL=admin@assessment.com
ADMIN_PASSWORD=AdminPassword123!

# Security Parameters
BCRYPT_SALT_ROUNDS=12
```

---

## 7. Execution and Testing Commands

### Install Dependencies
```bash
cd server
npm install
```

### Run Automated Tests (Isolated In-Memory Database)
```bash
npm run test
```
*Executes all 22 Vitest test cases covering models, unique indexes, password hashing, JWT RBAC, error handlers, and seeder idempotency using `mongodb-memory-server`.*

### Database Seeding
```bash
# Seed all entities (Admin + Settings + Questions)
npm run seed

# Or run individual seeders:
npm run seed:admin
npm run seed:settings
npm run seed:questions
```

### Start Development Server
```bash
npm run dev
```

### Check API Health
```bash
curl http://localhost:5000/api/health
```
Response:
```json
{
  "success": true,
  "message": "Aptitude Assessment API is running",
  "database": "connected",
  "timestamp": "2026-11-23T15:18:25.000Z"
}
```
