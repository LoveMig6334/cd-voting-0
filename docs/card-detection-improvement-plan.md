# Card Detection Improvement Plan: Phase 2

## Problem Analysis

### Observed Issue (Screenshot 2025-12-29)
- **Input**: Portrait-oriented image containing a Thai student ID card
- **Detection Method Used**: `center_crop_portrait` (fallback)
- **Confidence**: 20.0% (very low)
- **Result**: Wrong cropping - captured background instead of the card

### Root Cause Analysis

The detection pipeline has **three strategies** executed in order:

```
Strategy 1: detectQuadrilateral()  → Uses Sobel edges + convex hull
Strategy 2: detectEdgeBoundary()   → Uses combined edge + color masks
Strategy 3: createSmartFallback()  → Blind center crop based on orientation
```

**Why did Strategy 1 (Quadrilateral) fail?**
- Sobel edge detection may not have produced clean enough edges
- The convex hull may have been too noisy
- Area/aspect ratio validation may have rejected valid candidates

**Why did Strategy 2 (Edge Boundary) fail?**
- `findBoundaryFromMasks()` finds the bounding box of ALL detected pixels
- If background noise is detected (bed pattern in the image), the bounding box becomes the entire image
- Aspect ratio check (1.1 - 2.5) then rejects it because the bounding box is wrong

**Why is Strategy 3 (Center Crop) wrong?**
- It doesn't use any actual detection - it blindly crops the center
- For portrait images: takes 90% width, calculates height from aspect ratio, centers vertically
- Problem: The card could be anywhere in the frame, not just the center

## Detection Method Details

### 1. Quadrilateral Detection (`detectQuadrilateral`)
```
Location: card-detector.ts:139-173

Flow:
1. Apply Sobel edge detection to image
2. Find contours using flood-fill tracing
3. Simplify contours and compute convex hull
4. Order corners using robustSortCorners (TL, TR, BR, BL)
5. Validate: convexity, area (10-95% of image), aspect ratio (1.0-2.8)
6. Calculate confidence score
7. Return if confidence >= 30%

Strengths:
- Most accurate when it works
- Handles perspective distortion

Weaknesses:
- Requires clean edges (fails with noisy backgrounds)
- Complex lighting conditions break edge detection
```

### 2. Edge Boundary Detection (`detectEdgeBoundary`)
```
Location: card-detector.ts:331-363

Flow:
1. Combine edge mask and color mask
2. Find bounding box of ALL detected pixels
3. Validate aspect ratio (1.1-2.5)
4. Return with 50% confidence

Strengths:
- Uses color information (yellow/blue card detection)
- Simpler than quadrilateral detection

Weaknesses:
- Finds bounding box of ALL detected pixels (noise included)
- No clustering or connected component analysis
- Background patterns trigger false positives
```

### 3. Center Crop Fallback (`createSmartFallback`)
```
Location: card-detector.ts:412-466

Flow (Portrait):
1. Calculate crop width = 90% of image width
2. Calculate crop height = width / 1.586 (ISO 7810 ratio)
3. Center the rectangle in the image
4. Return with 20% confidence, success=false

Flow (Landscape):
1. Take 80% of both dimensions
2. Center the rectangle
3. Return with 20% confidence, success=false

Strengths:
- Always returns something (never fails)
- Correct aspect ratio

Weaknesses:
- Completely ignores where the card actually is
- Blind guess based only on orientation
- Almost always wrong for real-world images
```

## Proposed Solution

### Goal
Replace the blind `center_crop_portrait/landscape` fallback with an **improved edge boundary detection** that uses:
1. Connected component analysis to isolate the card region
2. Color-weighted bounding box calculation
3. Largest valid region selection

### Implementation Plan

#### Step 1: Add Connected Component Analysis
Create a function to find connected regions in the color mask:
```typescript
function findConnectedComponents(
  mask: Uint8Array,
  width: number,
  height: number
): ConnectedComponent[]
```

#### Step 2: Filter Components by Size and Aspect Ratio
```typescript
function filterCardCandidates(
  components: ConnectedComponent[],
  imageArea: number
): ConnectedComponent[]
```
- Minimum size: 5% of image area
- Maximum size: 90% of image area
- Aspect ratio: 1.0 - 3.0 (more lenient than current)

#### Step 3: Score and Select Best Candidate
```typescript
function selectBestCandidate(
  candidates: ConnectedComponent[],
  state: DetectionState
): BoundingRect | null
```
Scoring criteria:
- Aspect ratio similarity to 1.586 (ISO 7810)
- Size (prefer larger)
- Color density (prefer regions with more card-colored pixels)
- Position (prefer center-ish locations)

#### Step 4: Update Detection Flow
```typescript
export function detectCard(...): ExtendedDetectionResult {
  // Strategy 1: Quadrilateral (unchanged)
  const quadResult = detectQuadrilateral(state);
  if (quadResult) return quadResult;

  // Strategy 2: Edge boundary (unchanged)
  const edgeResult = detectEdgeBoundary(state);
  if (edgeResult) return edgeResult;

  // Strategy 3: NEW - Connected component fallback
  const componentResult = detectByConnectedComponents(state);
  if (componentResult) return componentResult;

  // Strategy 4: Ultimate fallback - use largest color region
  return createColorBasedFallback(state);
}
```

#### Step 5: Remove Blind Center Crop
- Delete `center_crop_portrait` and `center_crop_landscape` methods
- Add new method: `color_region_fallback`
- Update `DetectionMethod` type

### File Changes Required

| File | Changes |
|------|---------|
| `lib/ocr/card-detector.ts` | Add connected component analysis, update detection flow |
| `lib/ocr/types.ts` | Update `DetectionMethod` type |
| `lib/ocr/constants.ts` | Add new thresholds for component filtering |

### New Functions to Implement

```typescript
// Connected component finding using flood-fill
function findConnectedComponents(
  mask: Uint8Array,
  width: number,
  height: number
): ConnectedComponent[]

// Filter components that could be cards
function filterCardCandidates(
  components: ConnectedComponent[],
  imageArea: number
): ConnectedComponent[]

// Score and select the best card candidate
function selectBestCandidate(
  candidates: ConnectedComponent[],
  state: DetectionState
): BoundingRect | null

// New detection strategy using connected components
function detectByConnectedComponents(
  state: DetectionState
): ExtendedDetectionResult | null

// New fallback using largest color region
function createColorBasedFallback(
  state: DetectionState
): ExtendedDetectionResult
```

### Expected Improvements

| Scenario | Before | After |
|----------|--------|-------|
| Card on dark background (portrait) | Center crop misses card | Color region finds card |
| Card on patterned background | Edge boundary fails | Connected components isolate card |
| Card at edge of frame | Center crop fails | Largest color region used |
| Multiple objects detected | Bounding box too large | Best candidate selected |

### Confidence Scoring Update

| Method | Current Confidence | New Confidence |
|--------|-------------------|----------------|
| quadrilateral | Calculated (30-100) | Unchanged |
| edge_boundary | 50 (fixed) | Unchanged |
| connected_component | N/A | 40 (new) |
| color_region_fallback | N/A | 25 (new) |
| center_crop_* | 20 (fixed) | REMOVED |

## Implementation Order

1. **Add ConnectedComponent interface and types**
2. **Implement `findConnectedComponents()` using flood-fill**
3. **Implement `filterCardCandidates()` with size/aspect filters**
4. **Implement `selectBestCandidate()` with scoring**
5. **Implement `detectByConnectedComponents()` as new strategy**
6. **Implement `createColorBasedFallback()` as ultimate fallback**
7. **Update `detectCard()` to use new strategies**
8. **Update `DetectionMethod` type in types.ts**
9. **Remove `createSmartFallback()` (center crop methods)**
10. **Test with problematic images**

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| New method slower than center crop | Optimize flood-fill, use early termination |
| Connected components miss small cards | Keep minimum area threshold low (5%) |
| Color detection fails on unusual cards | Keep edge boundary as fallback before component analysis |
| Regression in working cases | Test with diverse image set before deployment |
