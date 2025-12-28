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
  BoundingRect,
  ColorMaskResult,
  Contour,
  DetectionMethod,
  DetectionResult,
  EdgeDetectionResult,
  EnhancementConfig,
  ExtendedDetectionResult,
  HomographyResult,
  ImageDataWithDimensions,
  ImageDimensions,
  ImageOrientation,
  Matrix3x3,
  MutableMatrix3x3,
  Point,
  ProcessedImage,
  ProcessingOptions,
  Quadrilateral,
  WarpConfig,
} from "./types";

export {
  createBoundingRect,
  createDefaultProcessingOptions,
  createPoint,
  getImageOrientation,
  pointsToQuad,
  quadToPoints,
} from "./types";

// ============================================================================
// Error Exports
// ============================================================================

export type { DetectionError, Result } from "./errors";

export {
  andThen,
  CanvasContextError,
  DetectionErrorCode,
  err,
  errorToDiagnostic,
  ImageLoadError,
  InvalidAreaError,
  InvalidAspectRatioError,
  isErr,
  isOk,
  LowConfidenceError,
  map,
  mapErr,
  NoQuadrilateralFoundError,
  ok,
  SingularMatrixError,
  unwrap,
  unwrapOr,
  WarpFailedError,
} from "./errors";

// ============================================================================
// Constants Exports
// ============================================================================

export {
  CARD_DIMENSIONS,
  COLOR_THRESHOLDS,
  CONFIDENCE,
  CONTOUR_DETECTION,
  EDGE_DETECTION,
  ENHANCEMENT,
  FALLBACK,
  MATRIX,
  OVERLAY,
  QUADRILATERAL,
} from "./constants";

// ============================================================================
// Geometry Utilities Exports
// ============================================================================

export {
  clamp,
  clampPixel,
  convexHull,
  crossProduct,
  distance,
  getBoundingRect,
  getCardWarpDimensions,
  isConvexQuadrilateral,
  isOpenCVReady,
  OpenCVError,
  orderCorners,
  quadrilateralArea,
  rectToCorners,
  robustSortCorners,
  simplifyContour,
  transformPoint,
  warpImageDataISO,
  warpPerspectiveISO,
} from "./geometry-utils";

export type { CardWarpDimensions } from "./geometry-utils";

// ============================================================================
// Canvas Utilities Exports
// ============================================================================

export {
  applySobelEdgeDetection,
  canvasToDataUrl,
  createCanvas,
  drawDetectionOverlay,
  enhanceImage,
  getImageData,
  loadImage,
  scaleImage,
  simpleCrop,
  warpPerspective,
} from "./canvas-utils";

// ============================================================================
// Card Detection Exports
// ============================================================================

export { detectCard, getMethodDescription } from "./card-detector";

// ============================================================================
// Pipeline Manager Exports
// ============================================================================

export type { PipelineResult, PipelineStageResult } from "./pipeline-manager";

export {
  PipelineManager,
  processImage,
  processImageWithDiagnostics,
} from "./pipeline-manager";
