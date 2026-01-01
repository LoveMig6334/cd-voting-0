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
