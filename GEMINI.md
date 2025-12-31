# GEMINI.md

This file provides context and instructions for AI agents (Gemini) working on the `cd-voting-0` project.

## 1. Project Overview

**Name:** CD Voting 0 (School Election System)
**Purpose:** A web-based school election system allowing students to register via OCR (Student ID card scanning), view candidates, and vote. Includes an Admin dashboard for managing elections and viewing results.
**Current State:** Frontend-focused prototype with mock data and client-side logic. No real backend API is currently implemented.

### Technology Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI:** Tailwind CSS 4, Glassmorphism design system
- **State Management:** React Hooks, Context API
- **OCR:** `@techstark/opencv-js` (Image Processing) + `tesseract.js` (Text Recognition)
- **Icons:** Material Symbols Outlined (Google Fonts)
- **Visualization:** Recharts, TanStack Table

## 2. Architecture & Key Concepts

### Directory Structure (App Router)
- `app/(auth)/`: Login and Register pages.
- `app/(student)/`: Main student interface (Dashboard, Elections, Voting, Profile).
- `app/admin/`: Admin dashboard (Elections, Results, Settings).
- `components/`: Reusable UI components.
- `lib/ocr/`: Core OCR logic and image processing pipeline.
- `public/`: Static assets and mock data (`data.json`).

### Key Logic Flows

#### Authentication (Mock)
- **Implementation:** `hooks/useAuth.ts`
- **Mechanism:** Uses `localStorage` to simulate session management.
- **Credentials:**
  - Admin: `admin` / `admin123`
  - Student: Registered via OCR or mock login.

#### OCR Pipeline (`lib/ocr`)
- **Manager:** `PipelineManager` (`lib/ocr/pipeline-manager.ts`) orchestrates the process.
- **Stages:**
  1. `load_image`: Loads the image file.
  2. `get_image_data`: Extracts pixel data.
  3. `detect_card`: Uses OpenCV to find the student ID card boundaries.
  4. `draw_overlay`: Visualizes the detection on the original image.
  5. `crop_and_warp`: Perspective correction to flatten the card image for better OCR.
- **Result:** Returns processed image and extracted text data.

#### Data Management
- **Source:** `public/data.json` acts as the database.
- **Fetching:** `lib/student-data.ts` handles data retrieval (simulating async API calls).

## 3. Development Guidelines

### Build & Run
- **Dev Server:** `npm run dev`
- **Build:** `npm run build`
- **Start:** `npm start`
- **Lint:** `npm run lint`

### Coding Conventions
- **Directives:** Use `"use client"` at the top of interactive components.
- **Styling:** Use Tailwind CSS utility classes. For glass effects, use `.glass-card`, `.glass-navbar` defined in `globals.css`.
- **Types:** Prefer `interface` over `type` for object definitions (see `types.ts`).
- **Icons:** Use `<span className="material-symbols-outlined">icon_name</span>`.

### Specific Files to Watch
- `types.ts`: Central type definitions (`Student`, `Election`, `VoteRecord`, `OCRResponse`).
- `lib/ocr/pipeline-manager.ts`: detailed logic for image processing.
- `CLAUDE.md`: Contains similar project context and instructions.

## 4. Pending Tasks (Context)
The project is currently a "Client-side Mock". Future work involves:
- Implementing a real Backend API (Node.js/Python).
- Database integration (Firebase/PostgreSQL).
- Replacing mock auth with secure session/JWT handling.
