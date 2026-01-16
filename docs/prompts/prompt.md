# Role

Act as a Senior Frontend Developer specializing in Next.js 16.1.1 (App Router), TypeScript, and Tailwind CSS 4.0. You have a strong eye for typography and "Glassmorphism" design aesthetics.

# CRITICAL INSTRUCTION: Use Context7 MCP

**Before generating any code, you MUST use the `Context7 MCP` tool to research and verify the latest documentation.**

- Specifically, check for the correct configuration of **Tailwind CSS 4.0** (using the new CSS-based configuration via `@theme`) and **Next.js 16 implementation**.
- Do not rely solely on your internal training data; ensure all code examples utilize the latest stable API methods found via Context7.

# Task

Transform the existing **CD Voting 0** election website into a Thai font typography.

1. **Font Implementation:** Replace the current default font stack with a custom Thai font "Sukhumvit Set" (found in `public/Fonts/`).
2. **Localization:** Translate the majority of user-facing text (Buttons, Headers, Labels, Placeholders) from English to Thai.

# Tech Stack & Constraints

1.  **Framework:** Next.js 16 (App Router).
2.  **Styling:** Tailwind CSS 4 (using `app/globals.css` with `@theme` directive).
3.  **Fonts:**
    - **English:** `Inter` (Google Font).
    - **Thai (New):** `Sukhumvit Set` (Local files in `public/Fonts/*.ttf`).
4.  **Design System:** Glassmorphism (existing implementation in `globals.css`).
5.  **Language:** TypeScript.

# Implementation Guidelines

- **Preserve Aesthetics:** Do not break the existing "Glassmorphism" or "Neon" effects. The new font should enhance the premium feel.
- **Variable Names:** Ensure the CSS variable matches exactly between `layout.tsx` and `globals.css`.
