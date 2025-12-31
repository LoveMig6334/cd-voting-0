## Bolt: Optimized OCR pipeline by reducing canvas readbacks

💡 What:

Refactored enhanceImage, sharpenImage, and applyAdaptiveThreshold in lib/ocr/pipeline.ts to extract their core logic into new functions (enhanceImageData, sharpenImageData, applyAdaptiveThresholdToData) that accept and return ImageData directly.
Updated PipelineManager.processImage to utilize these new functions, allowing ImageData to be extracted once and passed between the image_enhancement and ocr_preprocessing stages.
Retained the original functions as wrappers to ensure backward compatibility.
🎯 Why:

ctx.getImageData() is a synchronous operation that forces a GPU pipeline flush and readback to the CPU, which is computationally expensive (often taking 10-50ms+ per call on mobile devices).
The previous implementation called getImageData multiple times for the same image data (once for sharpening, once for enhancement, once for thresholding), multiplying this cost.
📊 Impact:

Eliminates 2 redundant getImageData calls and 1 putImageData call per processed image.
Expected to reduce the total processing time of the pipeline, especially on lower-end devices where GPU-CPU bandwidth is a bottleneck.
microscope Measurement:

Verified via pnpm lint and pnpm build.
The logic remains functionally identical, but the data flow is optimized to minimize canvas API interaction.
