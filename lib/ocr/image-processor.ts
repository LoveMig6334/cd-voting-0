/**
 * Image Processing Pipeline - Main Entry Point
 *
 * This file re-exports all functionality from the modular OCR system.
 * The implementation has been split into specialized modules for better
 * maintainability and testability.
 *
 * Module Structure:
 * - constants.ts: All configuration values and magic numbers
 * - types.ts: TypeScript interfaces and type definitions
 * - errors.ts: Result pattern and structured error classes
 * - geometry-utils.ts: Math operations, matrices, convex hull
 * - canvas-utils.ts: Canvas manipulation, Sobel edge detection, warping
 * - card-detector.ts: Color segmentation, contour tracing, card detection
 * - pipeline-manager.ts: Main orchestrator for the processing pipeline
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  Point,
  BoundingRect,
  ImageDimensions,
  ImageOrientation,
  DetectionResult,
  DetectionMethod,
  ExtendedDetectionResult,
  ProcessedImage,
  ProcessingOptions,
  ColorMaskResult,
  EdgeDetectionResult,
  Contour,
  Quadrilateral,
  Matrix3x3,
  MutableMatrix3x3,
  HomographyResult,
  ImageDataWithDimensions,
  WarpConfig,
  EnhancementConfig,
} from "./types";

export {
  createDefaultProcessingOptions,
  createPoint,
  createBoundingRect,
  getImageOrientation,
  quadToPoints,
  pointsToQuad,
} from "./types";

// ============================================================================
// Error Exports
// ============================================================================

export type { Result, DetectionError } from "./errors";

export {
  DetectionErrorCode,
  ImageLoadError,
  NoQuadrilateralFoundError,
  LowConfidenceError,
  InvalidAspectRatioError,
  InvalidAreaError,
  WarpFailedError,
  SingularMatrixError,
  CanvasContextError,
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  map,
  mapErr,
  andThen,
  errorToDiagnostic,
} from "./errors";

// ============================================================================
// Constants Exports
// ============================================================================

export {
  CARD_DIMENSIONS,
  COLOR_THRESHOLDS,
  EDGE_DETECTION,
  CONTOUR_DETECTION,
  QUADRILATERAL,
  CONFIDENCE,
  FALLBACK,
  ENHANCEMENT,
  OVERLAY,
  MATRIX,
} from "./constants";

// ============================================================================
// Geometry Utilities Exports
// ============================================================================

export {
  crossProduct,
  distance,
  isConvexQuadrilateral,
  quadrilateralArea,
  getBoundingRect,
  rectToCorners,
  orderCorners,
  convexHull,
  simplifyContour,
  solveLinearSystem,
  invertMatrix3x3,
  getPerspectiveTransform,
  transformPoint,
  clamp,
  clampPixel,
} from "./geometry-utils";

// ============================================================================
// Canvas Utilities Exports
// ============================================================================

export {
  loadImage,
  createCanvas,
  getImageData,
  applySobelEdgeDetection,
  warpPerspective,
  enhanceImage,
  drawDetectionOverlay,
  simpleCrop,
  scaleImage,
  canvasToDataUrl,
} from "./canvas-utils";

// ============================================================================
// Card Detection Exports
// ============================================================================

export { detectCard, getMethodDescription } from "./card-detector";

// ============================================================================
// Pipeline Manager Exports
// ============================================================================

export type { PipelineStageResult, PipelineResult } from "./pipeline-manager";

export {
  PipelineManager,
  processImage,
  processImageWithDiagnostics,
} from "./pipeline-manager";
