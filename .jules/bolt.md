# Bolt's Journal

## 2026-01-01 - Optimization of Hough Transform and Rescale

**Learning:** Multiple iterations of `HoughLines` with different thresholds are redundant because OpenCV's `HoughLines` returns results sorted by votes. Slicing the top N results from a single call with the lowest threshold is significantly faster and achieves similar filtering. `INTER_LINEAR` is faster than `INTER_AREA` for downsampling when absolute precision isn't required (e.g., for edge detection).
**Action:** Replace `HoughLines` loop with a single call and slice; switch `INTER_AREA` to `INTER_LINEAR` in the card detection pipeline.

## 2026-01-01 - Eliminating srcMatCreation Bottleneck

**Profiling revealed:**

- `srcMatCreation`: 173.80ms (canvas readback)
- `warpPerspective`: 50.50ms
- Total: 233.50ms

**Root cause:** Detection stage already has 1024px ImageData, but `cropAndWarp` was ignoring it and re-reading full-res pixels via slow canvas readback.

**Solution:** Pass detection ImageData directly to `cropAndWarp`:

- Return both unscaled (for warp) and scaled (for overlay) detection
- Use `detectionImageData` instead of `undefined`

**Expected result:** srcMatCreation ~5ms, Total <100ms

## 2026-10-18 - LUT Optimization for Image Enhancement

**Profiling revealed:**
- `enhanceImageData` (Original): ~9.5ms for 12MP image
- `enhanceImageData` (LUT): ~1.3ms for 12MP image
- Speedup: ~7x

**Learning:** Per-pixel floating point arithmetic in image processing loops (contrast/brightness) is a significant bottleneck. Since pixel values are 8-bit integers (0-255), the result space is small.

**Action:** Replace arithmetic formulas in pixel loops with precomputed Lookup Tables (LUTs) whenever the transformation depends only on the pixel value and constants.
