# Thai OCR Accuracy Improvement Plan

This document outlines an actionable strategy to boost Thai OCR accuracy using Tesseract.js, focusing on practical scripts and configuration refinements.

## 1. Image Preprocessing Pipeline

Tesseract's accuracy is heavily dependent on input image quality. The following preprocessing steps are critical for Thai script.

### 1.1 Grayscale & Binarization (Thresholding)

Converting images to binary (black & white) helps Tesseract separate text from background noise.

**Recommended Script (Canvas API):**

```typescript
/**
 * Converts image data to grayscale and applies Otsu's thresholding
 */
export function applyBinarization(
  data: Uint8ClampedArray,
  width: number,
  height: number
): void {
  // 1. Convert to Grayscale
  const grayscale = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    // Luminance formula: 0.299R + 0.587G + 0.114B
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    grayscale[i / 4] = gray;
  }

  // 2. Calculate Otsu's Threshold
  const threshold = getOtsuThreshold(grayscale);

  // 3. Apply Threshold
  for (let i = 0; i < data.length; i += 4) {
    const val = grayscale[i / 4] > threshold ? 255 : 0;
    data[i] = val; // R
    data[i + 1] = val; // G
    data[i + 2] = val; // B
    // Alpha remains unchanged
  }
}

/**
 * Calculates the optimal threshold using Otsu's method
 */
function getOtsuThreshold(grayData: Uint8Array): number {
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < grayData.length; i++) {
    histogram[grayData[i]]++;
  }

  let total = grayData.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVar = 0;
  let threshold = 0;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > maxVar) {
      maxVar = varBetween;
      threshold = t;
    }
  }
  return threshold;
}
```

### 1.2 Resolution Scaling

OCR works best when characters are at least 20-30 pixels tall.

- **Action**: Scale input images so the text height is optimal (usually scaling the entire card to ~1000px width is sufficient).
- **Existing**: `scaleImage` exists but ensure it's used _before_ OCR.

### 1.3 Denoising (Median Filter)

Thai characters have intricate details (diacritics). Salt-and-pepper noise can confuse the engine.

- **Action**: Apply a 3x3 median filter if the image is noisy.

## 2. Tesseract Configuration

Fine-tuning the engine is as important as preprocessing.

### 2.1 Language & Mode

- **Language**: Use `tha` mainly. If expecting English headers, use `tha+eng` but be aware mixed models can lower accuracy for specific scripts.
- **OEM (OCR Engine Mode)**: Default (LSTM) is best for Thai.

### 2.2 Page Segmentation Mode (PSM)

Thai ID cards have structured layouts.

- **`PSM 6` (Assume a single uniform block of text)**: Good for the whole card.
- **`PSM 4` (Assume a single column of text of variable sizes)**: Can work if fields are aligned.
- **`PSM 7` (Treat the image as a single text line)**: **Best practice** is to crop specific regions (Name, ID) and run OCR on them individually with PSM 7.

**Configuration Object:**

```typescript
const ocrConfig = {
  lang: "tha", // or "tha+eng"
  tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK, // Try SINGLE_BLOCK (6) or SINGLE_LINE (7) for crops
  tessedit_char_whitelist:
    "0123456789กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรฤลฦวศษสหฬอฮฯะัาำิีึืฺุูเแโใไๅๆ็่้๊๋์", // Optional: restrict to Thai + Digits
};
```

### 2.3 Character Whitelisting

To prevent "hallucination" of special characters:

- **Digits-only fields (ID, Date)**: Whitelist `0123456789/.-`.
- **Name fields**: Whitelist Thai characters + spaces.

## 3. Post-Processing & Correction

Thai script has many look-alike characters (e.g., `ด` vs `ค`, `บ` vs `ป`).

### 3.1 Common Confusion Map

Create a dictionary replacer for common OCR errors.

```typescript
const THAI_OCR_CORRECTIONS: Record<string, string> = {
  ภ: "ถ", // Common confusion
  ฎ: "ฏ",
  บ: "ข", // Sometimes happens with bad fonts
  "0": "O", // English O to Zero
  "๑": "1", // Thai numerals to Arabic
  // ... add observed errors from debug logs
};

function correctThaiText(text: string): string {
  return text
    .split("")
    .map((char) => THAI_OCR_CORRECTIONS[char] || char)
    .join("");
}
```

### 3.2 Dictionary Matching

For names and surnames, fuzzy match against a known database (like `data.json`) using Levenshtein distance.

## 4. Implementation Strategy (Changes to Codebase)

1.  **Modify `lib/ocr/canvas-utils.ts`**:
    - Add `applyBinarization` (Otsu's).
    - Add `applyMedianFilter` (Denoising).
2.  **Update `lib/ocr/image-processor.ts`**:
    - Include binary thresholding in the `enhanceImage` pipeline (or as a separate option).
3.  **Update `app/debug/ocr/page.tsx`**:
    - Add toggles for "Binarize" and "Denoise" in the UI to test their effect.
    - Allow changing PSM modes via UI dropdown.
4.  **Refine `lib/ocr/parser.ts`**:
    - Inject the `correctThaiText` logic before Regex parsing.

## 5. Next Steps

1.  Implement **Otsu's Binarization** in `canvas-utils.ts`.
2.  Update the Debug UI to utilize this new pre-processing step.
3.  Test with proper Thai ID samples.
