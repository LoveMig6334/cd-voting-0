# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CD Voting 0 is a Next.js-based school election system for online voting. Features include role-based access (Student/Admin), manual student login with National ID auto-fill, and real-time vote tracking. Currently uses mock data with no backend implementation.

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Run production build
npm run lint     # Run ESLint
```

## Tech Stack

- **Framework:** Next.js 16 with App Router, React 19, TypeScript (strict mode)
- **Styling:** Tailwind CSS 4, glassmorphism design patterns
- **UI Libraries:** TanStack React Table, Recharts, Material Symbols Outlined icons
- **OCR (Legacy/Debug):** Tesseract.js and OpenCV.js available for student card scanning (currently in debug pages)

## Architecture

### Route Groups

- `app/(auth)/` - Authentication pages (login, register)
- `app/(student)/` - Protected student routes (dashboard, elections, profile, voting)
- `app/admin/` - Admin dashboard and management pages

### Key Directories

- `components/` - Reusable UI components (BottomNav, AdminNavbar, ElectionCard)
- `hooks/` - Custom React hooks (useAuth for localStorage-based auth)
- `lib/` - Utilities (student-data.ts for mock data fetching)
- `types.ts` - TypeScript interfaces for Candidate, Election, VoteRecord, Student, OCRResponse

### Data Flow

- Authentication: `useAuth` hook stores user in localStorage (`currentUser` key)
- Mock admin credentials: `admin`/`admin123`
- Student data: Mock database in `public/data.json` (Thai language content)

## Code Conventions

- Mark interactive components with `"use client"` directive
- Use Material Symbols Outlined for icons (loaded via Google Fonts CDN)
- Apply glassmorphism classes (`.glass-card`, `.glass-navbar`, `.glass-panel`) from globals.css
- Path alias: `@/*` maps to project root
- TypeScript interfaces preferred over types

## Styling Patterns

Custom CSS in `globals.css` includes:

- Glassmorphism utilities with backdrop blur
- Custom animations: scan, fadeIn, slideUp, float, pulse-glow, neon-pulse, modalBackdrop, modalContent
- Color palette: primary (#137fec), royal-blue (#1a56db), vivid-yellow (#fbbf24)

### Animation Guidelines (Tailwind CSS v4)

**IMPORTANT:** Always use Tailwind utility classes for animations, NOT inline styles.

**Correct:**

```tsx
<div className="animate-modal-backdrop">
```

**Wrong:**

```tsx
<div style={{ animation: "modalBackdrop 0.3s ease-out" }}>
```

**Best Practices:**

- Animate only `opacity` and `transform` (GPU-accelerated)
- Avoid animating `backdrop-filter`, `filter`, `width`, `height`, or layout properties
- Keep durations between 0.2s - 0.4s for optimal UX
- Define animations in `@theme` block in `globals.css`

**Modal Components:**

- Always handle scrollbar jump by calculating `window.innerWidth - document.documentElement.clientWidth`
- Add padding-right to body equal to scrollbar width when modal opens
- Reset styles on cleanup

See [`docs/practices/ANIMATION_AND_MODAL_BEST_PRACTICES.md`](docs/practices/ANIMATION_AND_MODAL_BEST_PRACTICES.md) for complete guide.

## Current State

- All data is mock/client-side (no backend API implemented)
- Tesseract.js is integrated into debug laboratory pages (`app/debug/`)
- TanStack Table used for Admin results and student management
- README.md contains extensive Thai documentation with API design specs and TODO list
