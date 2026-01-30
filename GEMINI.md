# GEMINI.md

This file provides context and instructions for AI agents (Gemini) working on the `cd-voting-0` project.

## 1. Project Overview

**Name:** CD Voting 0 (School Election System)
**Purpose:** A web-based school election system allowing students to login via Student ID and National ID (with auto-fill logic), view candidates, and vote. Includes an Admin dashboard for managing elections and viewing results.
**Current State:** Full-stack application with MySQL database. All data operations use Server Actions. OCR is maintained as a Debug Laboratory for research purposes.

### Technology Stack

- **Framework:** Next.js 16.1 (App Router)
- **Language:** TypeScript
- **UI:** Tailwind CSS 4, Glassmorphism design system
- **State Management:** Server Actions (MySQL), React Server Components
- **OCR:** `@techstark/opencv-js` (Image Processing) + `tesseract.js` (Text Recognition)
- **Icons:** Material Symbols Outlined (Google Fonts)
- **Visualization:** Recharts, TanStack Table v8

## 2. Architecture & Key Concepts

### Directory Structure (App Router)

- `app/(auth)/`: Login and Register pages.
- `app/(student)/`: Main student interface (Dashboard, Elections, Voting, Profile).
- `app/admin/`: Admin dashboard (Elections, Results, Settings).
- `components/`: Reusable UI components.
- `lib/ocr/`: Core OCR logic and image processing pipeline.
- `public/`: Static assets and mock data (`data.json`).

### Key Logic Flows

#### Authentication (Session-based)

- **Implementation:** `lib/actions/auth.ts` (Student), `lib/actions/admin-auth.ts` (Admin)
- **Mechanism:** Server-side sessions stored in MySQL with httpOnly cookies (`session_id`, `admin_session_id`).
- **Credentials:**
  - Admin: Stored in MySQL `admins` table with bcryptjs password hashing.
  - Student: Authenticated by matching Student ID and National ID against MySQL `students` table.
  - Auto-fill: Entering 4-digit Student ID and 13-digit National ID automatically retrieves and fills student name/surname.
- **Route Protection:** Server Components check `getCurrentSession()` / `getCurrentAdmin()` in layout files.

#### OCR Laboratory (`lib/ocr` & `app/debug`)

- **Status:** Currently decoupled from the main login flow, maintained as a "Debug Laboratory" for future integration.
- **Manager:** `PipelineManager` (`lib/ocr/pipeline-manager.ts`) orchestrates the vision pipeline.
- **Stages:**
  1. `load_image`: Loads the image file.
  2. `get_image_data`: Extracts pixel data.
  3. `detect_card`: Uses OpenCV to find the student ID card boundaries.
  4. `draw_overlay`: Visualizes the detection on the original image.
  5. `crop_and_warp`: Perspective correction to flatten the card image for better OCR.
- **Result:** Returns processed image and extracted text data.

#### Data Management

- **Source:** MySQL database via `lib/db.ts` connection pool
- **Operations:** Server Actions in `lib/actions/` for all CRUD (elections, votes, students, activities, public-display)
- **Pattern:** Server Components fetch data → pass to Client Components via props

## 3. Development Guidelines

### Build & Run

- **Dev Server:** `npm run dev`
- **Build:** `npm run build`
- **Start:** `npm start`
- **Lint:** `npm run lint`
- **Test:** `npm run test`

### Coding Conventions

- **Directives:** Use `"use client"` at the top of interactive components.
- **Styling:** Use Tailwind CSS utility classes. For glass effects, use `.glass-card`, `.glass-navbar` defined in `globals.css`.
- **Types:** Prefer `interface` over `type` for object definitions (see `types.ts`).
- **Icons:** Use `<span className="material-symbols-outlined">icon_name</span>`.

### Specific Files to Watch

- `types.ts`: Central type definitions (`Student`, `Election`, `VoteRecord`, `OCRResponse`).
- `lib/ocr/pipeline-manager.ts`: detailed logic for image processing.
- `CLAUDE.md`: Contains similar project context and instructions.

## 4. Current Status

The project has been **fully migrated** from client-side mock to MySQL:

- Session-based auth with MySQL (Student + Admin)
- Server Actions for all data operations (auth, elections, votes, students, activities, public-display)
- Role-based access control (4 levels)
- All localStorage stores removed

Remaining work:

- Production deployment configuration
