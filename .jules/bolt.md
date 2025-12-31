## 2025-12-31 - Optimized OCR Pipeline Image Transfer
**Learning:** Extracting ImageData from a Canvas is expensive (synchronous GPU readback). Doing it repeatedly for the same image in a processing pipeline wastes significant time (10-50ms+ depending on resolution).
**Action:** When building image processing pipelines, extract ImageData once and pass it through the stages, rather than re-creating canvases and re-extracting data in each function.
