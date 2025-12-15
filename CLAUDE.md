# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CD Voting 0 is a Next.js-based school election voting system with mobile-first UI, OCR-enabled student registration via Tesseract.js, and transparent ballot tracking using verification tokens.

**Stack:** Next.js 16.0.10, React 19.2.1, TypeScript 5, Tailwind CSS 4

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Run production server
npm run lint     # Run ESLint
```

## Architecture

### Route Structure (Next.js App Router)

```
app/
├── (auth)/           # Unauthenticated routes
│   ├── login/        # Animated landing page
│   └── register/     # Student registration with OCR
├── (student)/        # Authenticated student routes
│   ├── page.tsx      # Dashboard - active elections
│   ├── elections/[id]/ # Multi-position voting interface
│   ├── vote-success/ # Confirmation with token display
│   ├── me/           # Profile page
│   ├── me/votes/     # Vote history with verification
│   └── analytics/    # Election results
└── camera-overlay/   # OCR camera interface
```

### Key Directories

- `components/` - Reusable UI components (BottomNav, OCR overlay)
- `hooks/` - Custom React hooks (`useAuth` for authentication state via localStorage)
- `lib/` - Utilities (`student-data.ts` for database lookups)
- `types.ts` - Global TypeScript interfaces (Candidate, Election, VoteRecord, Student, OCRResponse)
- `public/data.json` - Student database (gitignored in production)

### State Management

- **Authentication:** localStorage + `useAuth` hook
- **Vote state:** React local state in voting pages
- **No global state library** - uses React hooks throughout

### Styling

- Tailwind CSS 4 with custom CSS variables (--primary, --primary-dark, --accent-yellow)
- Material Design Icons via Google Fonts (`className="material-symbols-outlined"`)
- Custom animations defined in globals.css (fade-in, slide-up, float, pulse-glow, scale-up)

## Current Implementation Status

**Working:**
- Login/registration pages with animated UI
- Multi-step voting interface (9 student council positions)
- Vote confirmation with token display
- Vote history and profile pages
- Bottom navigation component

**Mock/Placeholder:**
- OCR scanning component (Tesseract.js imported, needs API integration)
- Analytics/results page
- Email token verification

**Not Implemented:**
- Backend API routes (no `/api` routes)
- Database integration (designed for Firebase)
- Admin dashboard
- Vote persistence
- Real email sending

## Path Aliases

`@/*` maps to project root - use `@/components`, `@/hooks`, `@/lib`, `@/types`

## Notes

- All interactive components require `"use client"` directive
- README.md contains detailed Thai-language documentation with data models and API design specs
- The voting flow supports 9 student council positions with candidate selection
