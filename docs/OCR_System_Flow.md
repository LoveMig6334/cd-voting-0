# OCR System Architecture & Flow

This document provides a comprehensive overview of the OCR (Optical Character Recognition) system used in the "CD Voting" project. The system is designed to detect Thai Student ID cards, extract text, and parse student information for verification.

## System Overview

The OCR system follows a linear pipeline architecture:
**Input Image** $\rightarrow$ **Preprocessing & Detection** $\rightarrow$ **Transformation** $\rightarrow$ **OCR Engine** $\rightarrow$ **Text Parsing** $\rightarrow$ **Data Validation**

The core logic resides in `lib/ocr/`, with a debug interface available at `app/debug/ocr/`.

## 1. Frontend & Orchestration

### Debug Interface (`app/debug/ocr/page.tsx`)
The debug page acts as the controller for the OCR pipeline during development/testing. It manages the state of:
- **Image Upload**: Handles file input and preview.
- **Pipeline Execution**: Triggers the processing stages.
- **Tesseract Integration**: Client-side OCR execution.
- **Parsing & Validation**: Displays extracted data and verification results against `data.json`.

### Pipeline Manager (`lib/ocr/pipeline-manager.ts`)
The `PipelineManager` class coordinates the image processing steps. It is responsible for:
- Timing execution for performance diagnostics.
- Managing error states using a Result pattern.
- Passing data between Detection, Overlay, and Warping stages.

## 2. Image Processing Pipeline

The image processing logic is split into specialized modules.

### A. Card Detection (`lib/ocr/card-detector.ts`)
Attempts to locate the ID card within the uploaded image using three strategies in order of preference:

1.  **Quadrilateral Detection (Primary)**:
    - **Color Segmentation**: Filters pixels based on Thai ID card colors (Yellow/Gold, Blue, Brightness) defined in `constants.ts`.
    - **Edge Detection**: Applies a Sobel operator to find gradients.
    - **Contour Tracing**: Uses flood-fill to find connected edge components.
    - **Shape Analysis**: Computes convex hulls and identifies quadrilaterals that match the aspect ratio of a standard CR80 card.

2.  **Edge Boundary (Fallback 1)**:
    - Finds the bounding box containing the majority of edge/color pixels.

3.  **Smart Crop (Fallback 2)**:
    - **Portrait Images**: Crops a horizontal rectangle from the center (fixes vertical squash issues).
    - **Landscape Images**: Crops the central 80% of the image.

### B. Geometry & Math (`lib/ocr/geometry-utils.ts`)
Provides mathematical primitives for:
- **Vector Math**: Cross products, distances.
- **Convex Hull**: Andrew's monotone chain algorithm.
- **Corner Ordering**: Geometrically sorting points (TL, TR, BR, BL).
- **Matrix Operations**: Gaussian elimination and matrix inversion for homography.

### C. Canvas Operations (`lib/ocr/canvas-utils.ts`)
Handles low-level pixel manipulation:
- **Perspective Warp**: Uses Homography (Direct Linear Transform) to map the detected quadrilateral to a flat rectangular view.
- **Enhancement**: Applies contrast and brightness adjustments to improve OCR accuracy.
- **Sobel Operator**: Implementation of edge detection kernels.

## 3. Text Extraction (OCR)

The system uses **Tesseract.js** running in the browser (client-side).
- **Input**: The cropped and enhanced image from the pipeline.
- **Languages**: `tha` (Thai) + `eng` (English).
- **Output**: Raw text string with confidence scores.

## 4. Parsing & Data Extraction (`lib/ocr/parser.ts`)

Converts raw, noisy OCR text into structured `StudentData`.

### Normalization
- Corrects common OCR look-alike errors (e.g., 'O' $\rightarrow$ '0', 'l' $\rightarrow$ '1').
- Normalizes Thai vowels (e.g., `ำ` decomposition).

### Field Extraction Strategy
Uses Regex patterns with varying confidence levels to extract:
1.  **Student ID**: Looks for 4-5 digit numbers near keywords like "เลขประจำตัว" or "Student ID".
2.  **Name/Surname**: Parses Thai honorifics (นาย, นางสาว, เด็กชาย) and separates First/Last names.
3.  **Classroom**: Matches patterns like "M.3/1" or "3/1".
4.  **National ID**: Validates 13-digit sequences (Standard Thai Citizen ID format).

## 5. Validation

### Data Validation (`lib/ocr/parser.ts` -> `validateParsedData`)
- Fetches the master student list from `/data.json`.
- Compares extracted Student ID.
- Verifies if Name, Surname, and Classroom match the database record.
- Returns match status: `Exact`, `Partial`, or `None`.

## Key Configuration (`lib/ocr/constants.ts`)
Centralizes "magic numbers" for tuning:
- **Card Dimensions**: Aspect ratio (1.586).
- **Color Thresholds**: RGB values for masking.
- **Confidence Scores**: Thresholds for accepting detection results.
- **Enhancement**: Contrast/Brightness levels.

## Error Handling (`lib/ocr/errors.ts`)
Implements a typed `Result<T, E>` pattern to handle failures gracefully without uncaught exceptions, providing user-friendly error messages for UI display.
