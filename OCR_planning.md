# Student ID OCR Implementation Plan

This document outlines the strategy for implementing the Student ID OCR feature in the "CD Voting 0" project.

## 1. Codebase Analysis

### Dependencies

- **Tesseract.js**: Already present in `package.json` (`^6.0.1`). This will be used for client-side OCR processing to avoid server costs and latency.
- **Tailwind CSS**: Used for styling the debug and production interfaces.

### Project Structure Integration

- **Logic**: OCR parsing logic will be isolated in `lib/ocr/parser.ts`.
- **UI Components**:
  - Isolated debug route: `app/debug/ocr/page.tsx`.
  - Production integration: (To be determined after debug phase).
- **Data**: Student data structure from `lib/student-data.ts` and `public/data.json` will be the target for the parser.

## 2. Nursery Step Strategy (Debug-First)

The implementation will follow a "Nursery Step" approach, starting with an isolated debug route. This allows for testing the OCR engine and parsing logic without interfering with the main application flow.

- **Route**: `/debug/ocr`
- **Goal**: Rapidly iterate on regex patterns and string manipulation logic to convert raw OCR text into structured `StudentData`.

## 3. Debug Window Features

### Raw Output Visualization

- **Layout**: A split-screen or side-by-side layout.
  - **Left Side**: Uploaded ID image preview.
  - **Right Side**: Raw text output from Tesseract.js.
- **Purpose**: Directly compare what the engine sees vs. what the image contains.

### Isolated Logic

- All text extraction logic (regex, trimming, sanitization) must live in `lib/ocr/parser.ts`.
- The UI should only call `parseOCRText(rawText: string): StudentData`.

### Hot-Reload Testing

- **State Management**: The UI will store the `rawText` output from the last OCR run in state.
- **Interaction**: A "Re-parse" button or a `useEffect` hook that triggers whenever `parser.ts` is updated (via hot-reload) to re-process the cached `rawText`.
- **Benefit**: Fix logic errors in the parser and see the results instantly without waiting for the (relatively slow) OCR process to run again.

## 4. Implementation Checklist

- [ ] **Step 1: Setup Library**
  - [ ] Create `lib/ocr/parser.ts` with a placeholder `parseOCRText` function.
- [ ] **Step 2: Create Debug Route**
  - [ ] Initialize `app/debug/ocr/page.tsx`.
  - [ ] Implement image upload and Tesseract.js integration.
  - [ ] Display raw output.
- [ ] **Step 3: Enhance Debug UI**
  - [ ] Add side-by-side visualization.
  - [ ] Implement hot-reload "Re-parse" logic.
- [ ] **Step 4: Refine Parser**
  - [ ] Identify key data points on Student ID (ID Number, Name, Surname, Classroom).
  - [ ] Implement regex patterns in `parser.ts`.
  - [ ] Test with multiple sample images.
- [ ] **Step 5: Final Validation**
  - [ ] Verify parsed data matches `public/data.json` entries.
