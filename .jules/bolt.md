# Bolt's Journal

## 2026-01-01 - Optimization of Hough Transform and Rescale

**Learning:** Multiple iterations of `HoughLines` with different thresholds are redundant because OpenCV's `HoughLines` returns results sorted by votes. Slicing the top N results from a single call with the lowest threshold is significantly faster and achieves similar filtering. `INTER_LINEAR` is faster than `INTER_AREA` for downsampling when absolute precision isn't required (e.g., for edge detection).
**Action:** Replace `HoughLines` loop with a single call and slice; switch `INTER_AREA` to `INTER_LINEAR` in the card detection pipeline.
