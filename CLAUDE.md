# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CD Voting 0 is a Next.js-based school election system for online voting. Features include role-based access (Student/Admin), manual student login with National ID auto-fill, and real-time vote tracking. Uses MySQL database with Server Actions for all data operations.

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Run production build
npm run lint     # Run ESLint
npm run test     # Run Jest tests
```

## Tech Stack

- **Framework:** Next.js 16.1 with App Router, React 19.2, TypeScript (strict mode)
- **Styling:** Tailwind CSS 4, glassmorphism design patterns
- **UI Libraries:** TanStack React Table v8, Recharts, Material Symbols Outlined icons
- **OCR (Legacy/Debug):** Tesseract.js and OpenCV.js available for student card scanning (currently in debug pages)

## Architecture

### Route Groups

- `app/(auth)/` - Authentication pages (login, register)
- `app/(student)/` - Protected student routes (dashboard, elections, profile, voting)
- `app/admin/` - Admin dashboard and management pages

### Key Directories

- `components/` - Reusable UI components (BottomNav, AdminNavbar, ElectionCard)
- `lib/actions/` - Server Actions for all data operations (auth, elections, votes, students, activities, public-display)
- `lib/db.ts` - MySQL connection pool with query/execute/transaction helpers
- `types.ts` - TypeScript interfaces for Candidate, Election, VoteRecord, Student, OCRResponse

### Data Flow

- Authentication: Session-based auth via Server Actions (`lib/actions/auth.ts`, `lib/actions/admin-auth.ts`) with MySQL-backed sessions and httpOnly cookies
- Admin credentials: Stored in MySQL `admins` table with bcryptjs password hashing
- Student data: MySQL `students` table (some legacy mock data still in `public/data.json`)

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

- **Data layer:** Fully migrated to MySQL via Server Actions (`lib/actions/`) — no localStorage stores remain
- **Auth:** Session-based auth with httpOnly cookies (`session_id`, `admin_session_id`)
- **Pattern:** Server Components fetch data → pass to Client Components via props
- Tesseract.js is integrated into debug laboratory pages (`app/debug/`)
- TanStack Table used for Admin results and student management
- README.md contains extensive Thai documentation with API design specs and TODO list

## Common Mistakes to Avoid

### 1. React Components Inside Render

**Wrong:** Defining components inside another component's body

```tsx
function ParentComponent() {
  const ChildComponent = ({ label }: { label: string }) => (
    <button>{label}</button>
  );
  return <ChildComponent label="Click" />;
}
```

**Correct:** Define components outside or use useMemo/useCallback

```tsx
function ChildComponent({ label }: { label: string }) {
  return <button>{label}</button>;
}

function ParentComponent() {
  return <ChildComponent label="Click" />;
}
```

> ESLint error: `react-hooks/static-components` - "Cannot create components during render"

### 2. Function Signature Mismatch

Always check existing function signatures before calling. Common mistakes:

- `getVoterTurnout(electionId)` → actually requires `getVoterTurnout(electionId, totalEligible)`
- `getPositionResults(electionId, positionId)` → actually requires `getPositionResults(electionId, positionId, positionTitle)`

**Tip:** Use `view_code_item` or hover in IDE to check function parameters before calling.

### 3. Mock Session Data Structure

When mocking `getCurrentSession()` in tests, use the correct `SessionData` interface:

**Wrong:**

```ts
mockedGetCurrentSession.mockResolvedValue({
  studentId: "1234",
  name: "Test", // ❌ 'name' does not exist in SessionData
  classRoom: "3/1", // ❌ 'classRoom' does not exist in SessionData
});
```

**Correct:**

```ts
mockedGetCurrentSession.mockResolvedValue({
  studentId: "1234",
  student: {
    id: "1234",
    name: "Test",
    class_room: "3/1",
    // ... other StudentRow fields
  } as StudentRow,
});
```

### 4. Tailwind CSS v4 Gradient Syntax

**Wrong:** `bg-gradient-to-br`
**Correct:** `bg-linear-to-br`

Tailwind CSS v4 uses `bg-linear-*` instead of `bg-gradient-*`.
