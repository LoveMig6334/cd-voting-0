# Role

Act as a Senior Frontend Developer specializing in Next.js 16.1.1 (App Router), TypeScript, and Tailwind CSS 4.0. You have a strong eye for typography and "Glassmorphism" design aesthetics.

# CRITICAL INSTRUCTION: Use Context7 MCP

**Before generating any code, you MUST use the `Context7 MCP` tool to research and verify the latest documentation.**

- Specifically, check for the correct configuration of **Tailwind CSS 4.0** (using the new CSS-based configuration via `@theme`) and **Next.js 16 `next/font/local`** implementation.
- Do not rely solely on your internal training data; ensure all code examples utilize the latest stable API methods found via Context7.

# Task

Transform the existing **CD Voting 0** election website into a Thai-localized application with a premium typography feel.

1. **Font Implementation:** Replace the current default sans-serif font stack with a custom Thai font "Sukhumvit Set" (found in `public/Fonts/`) as the **primary** font for Thai text, while keeping "Inter" for English text where appropriate.
2. **Localization:** Translate the majority of user-facing text (Buttons, Headers, Labels, Placeholders) from English to Thai.

# Tech Stack & Constraints

1.  **Framework:** Next.js 16 (App Router).
2.  **Styling:** Tailwind CSS 4 (using `app/globals.css` with `@theme` directive).
3.  **Fonts:**
    - **English:** `Inter` (Google Font).
    - **Thai (New):** `Sukhumvit Set` (Local files in `public/Fonts/*.ttf`).
4.  **Design System:** Glassmorphism (existing implementation in `globals.css`).
5.  **Language:** TypeScript.

# Deliverables

Please provide the code and file structure for the following. Use the file path as the header for each code block.

## 1. Font Configuration Update

- **`app/layout.tsx`**:
  - Use `next/font/local` to load `Sukhumvit Set` from `public/Fonts/`.
  - Map the weights correctly:
    - `SukhumvitSet-Thin.ttf` -> 100
    - `SukhumvitSet-Light.ttf` -> 300
    - `SukhumvitSet-Text.ttf` -> 400 (Normal)
    - `SukhumvitSet-Medium.ttf` -> 500
    - `SukhumvitSet-SemiBold.ttf` -> 600
    - `SukhumvitSet-Bold.ttf` -> 700
  - Define a CSS variable `--font-sukhumvit` for it.
  - Update the `<body>` class to include this variable.
- **`app/globals.css`**:
  - Update the `@theme` block.
  - Modify `--font-display` to prioritize `Inter` then `Sukhumvit Set` (e.g., `var(--font-inter), var(--font-sukhumvit), sans-serif`). This ensures robust fallback and correct rendering for mixed content.

## 2. Localization Implementation (Sample Pages)

Modify the following key files to translate visible text to Thai. Use natural, formal Thai appropriate for a school election system.

- **`app/(auth)/login/page.tsx`**: Title "Student Login" -> "เข้าสู่ระบบนักเรียน", "Student ID" -> "รหัสนักเรียน", etc.
- **`app/(student)/dashboard/page.tsx`**: "Welcome" -> "ยินดีต้อนรับ", "Your Vote Matters" -> "ทุกเสียงของคุณมีความหมาย".
- **`components/Navbar.tsx`** (or similar navigation component): Translate menu items (Home, Vote, Results -> หน้าหลัก, ลงคะแนน, ผลการเลือกตั้ง).

## 3. Verification Steps

- Explain how to verify that the Tailwind 4 config correctly picks up the new CSS variables from `layout.tsx`.

# Implementation Guidelines

- **Preserve Aesthetics:** Do not break the existing "Glassmorphism" or "Neon" effects. The new font should enhance the premium feel.
- **Variable Names:** Ensure the CSS variable matches exactly between `layout.tsx` and `globals.css`.
- **Fallbacks:** Always include `sans-serif` at the end of the font stack.
