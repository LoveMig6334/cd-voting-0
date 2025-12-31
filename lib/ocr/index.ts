/**
 * OCR Module - Main Entry Point
 *
 * This module provides card detection and OCR text parsing functionality.
 *
 * Module Structure:
 * - constants.ts: Configuration values for detection and rendering
 * - types.ts: TypeScript interfaces, types, and error classes
 * - detector.ts: Canny edge detection-based card detection
 * - pipeline.ts: Image processing pipeline and canvas utilities
 * - parser.ts: OCR text parsing and validation
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  BoundingRect,
  DetectionError,
  DetectionMethod,
  DetectionResult,
  Err,
  ExtendedDetectionResult,
  ImageDataWithDimensions,
  ImageDimensions,
  ImageOrientation,
  Ok,
  Point,
  ProcessedImage,
  ProcessingOptions,
  Result,
} from "./types";

export {
  CanvasContextError,
  createBoundingRect,
  createDefaultProcessingOptions,
  createPoint,
  DetectionErrorCode,
  err,
  errorToDiagnostic,
  getImageOrientation,
  ImageLoadError,
  isErr,
  isOk,
  ok,
  WarpFailedError,
} from "./types";

// ============================================================================
// Constants Exports
// ============================================================================

export {
  CANNY_EDGE_DETECTION,
  CARD_DIMENSIONS,
  ENHANCEMENT,
  OVERLAY,
} from "./constants";

// ============================================================================
// Detector Exports
// ============================================================================

export { detectCard, getMethodDescription } from "./detector";

// ============================================================================
// Pipeline Exports
// ============================================================================

export type { PipelineResult, PipelineStageResult } from "./pipeline";

export {
  canvasToDataUrl,
  createCanvas,
  drawDetectionOverlay,
  enhanceImage,
  getImageData,
  isOpenCVReady,
  loadImage,
  PipelineManager,
  processImage,
  processImageWithDiagnostics,
  scaleImage,
  sharpenImage,
  simpleCrop,
  warpPerspective,
} from "./pipeline";

// ============================================================================
// OpenCV Loader Exports
// ============================================================================

export { isOpenCVLoaded, loadOpenCV } from "./opencv-loader";

// ============================================================================
// Parser Exports
// ============================================================================

export { parseOCRText, validateParsedData } from "./parser";
