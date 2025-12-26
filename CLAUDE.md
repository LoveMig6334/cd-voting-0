# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CD Voting 0 is a Next.js-based school election system for online voting. Features include role-based access (Student/Admin), OCR-based registration via student cards, and real-time vote tracking. Currently uses mock data with no backend implementation.

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
- **OCR:** Tesseract.js for student card scanning

## Architecture

### Route Groups
- `app/(auth)/` - Authentication pages (login, register)
- `app/(student)/` - Protected student routes (dashboard, elections, profile, voting)
- `app/admin/` - Admin dashboard and management pages

### Key Directories
- `components/` - Reusable UI components (BottomNav, AdminNavbar, CameraOverlay)
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
- Custom animations: scan, fadeIn, slideUp, float, pulse-glow, neon-pulse
- Color palette: primary (#137fec), royal-blue (#1a56db), vivid-yellow (#fbbf24)

## Current State

- All data is mock/client-side (no backend API implemented)
- Tesseract.js and TanStack Table installed but not fully integrated
- README.md contains extensive Thai documentation with API design specs and TODO list
