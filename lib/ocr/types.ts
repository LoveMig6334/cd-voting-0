/**
 * Type definitions for the Image Processing Pipeline
 */

// ============================================================================
// Student Data (for OCR validation)
// ============================================================================

export interface StudentData {
  id: number;
  name: string;
  surname: string;
  classroom: string;
  no: number;
}

// ============================================================================
// Core Types
// ============================================================================

/**
 * 2D point with x and y coordinates
 */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Bounding rectangle definition
 */
export interface BoundingRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Image dimensions
 */
export interface ImageDimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * Image orientation determined by aspect ratio
 */
export type ImageOrientation = "portrait" | "landscape" | "square";

// ============================================================================
// Detection Types
// ============================================================================

/**
 * Detection method used (for diagnostics)
 */
export type DetectionMethod = "canny_edge_detection";

/**
 * Result of card boundary detection
 */
export interface DetectionResult {
  /** Whether detection was successful */
  readonly success: boolean;
  /** Detected corner points in order: TL, TR, BR, BL */
  readonly corners: readonly Point[];
  /** Bounding rectangle of detected area */
  readonly boundingRect: BoundingRect;
  /** Confidence score (0-100) */
  readonly confidence: number;
}

/**
 * Extended detection result with method information
 */
export interface ExtendedDetectionResult extends DetectionResult {
  /** Method used to detect the card */
  readonly method: DetectionMethod;
  /** Original image dimensions */
  readonly imageDimensions: ImageDimensions;
  /** Detected aspect ratio */
  readonly detectedAspectRatio: number;
}

// ============================================================================
// Pipeline Types
// ============================================================================

/**
 * Processed image output containing all pipeline results
 */
export interface ProcessedImage {
  /** Base64 image with detection overlay */
  readonly originalWithOverlay: string;
  /** Base64 cropped and warped card for display */
  readonly croppedCard: string;
  /** Base64 binary image optimized for OCR recognition */
  readonly thresholdedCard: string;
  /** Detection result details */
  readonly detectionResult: ExtendedDetectionResult;
}

/**
 * Options for the processing pipeline
 */
export interface ProcessingOptions {
  /** Enable card cropping and perspective warp */
  readonly enableCrop: boolean;
  /** Enable image enhancement (contrast/brightness) */
  readonly enableEnhancement: boolean;
  /** Enable OCR-specific preprocessing (adaptive thresholding) */
  readonly enableOcrPreprocessing: boolean;
}

/**
 * Image data with dimensions
 */
export interface ImageDataWithDimensions {
  readonly imageData: ImageData;
  readonly width: number;
  readonly height: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create default processing options
 */
export function createDefaultProcessingOptions(): ProcessingOptions {
  return {
    enableCrop: true,
    enableEnhancement: true,
    enableOcrPreprocessing: true,
  };
}

/**
 * Create a point
 */
export function createPoint(x: number, y: number): Point {
  return { x, y };
}

/**
 * Create a bounding rectangle
 */
export function createBoundingRect(
  x: number,
  y: number,
  width: number,
  height: number
): BoundingRect {
  return { x, y, width, height };
}

/**
 * Determine image orientation from dimensions
 */
export function getImageOrientation(
  width: number,
  height: number
): ImageOrientation {
  if (height > width) return "portrait";
  if (width > height) return "landscape";
  return "square";
}

// ============================================================================
// Error Handling (Result Pattern)
// ============================================================================

/**
 * Error codes for categorizing detection failures
 */
export enum DetectionErrorCode {
  IMAGE_LOAD_FAILED = "IMAGE_LOAD_FAILED",
  NO_QUADRILATERAL_FOUND = "NO_QUADRILATERAL_FOUND",
  LOW_CONFIDENCE = "LOW_CONFIDENCE",
  INVALID_ASPECT_RATIO = "INVALID_ASPECT_RATIO",
  AREA_TOO_SMALL = "AREA_TOO_SMALL",
  AREA_TOO_LARGE = "AREA_TOO_LARGE",
  WARP_FAILED = "WARP_FAILED",
  SINGULAR_MATRIX = "SINGULAR_MATRIX",
  CANVAS_CONTEXT_ERROR = "CANVAS_CONTEXT_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Base class for all detection errors
 */
export abstract class DetectionError extends Error {
  abstract readonly code: DetectionErrorCode;
  abstract readonly recoverable: boolean;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  getUserMessage(): string {
    return this.message;
  }
}

/**
 * Image failed to load
 */
export class ImageLoadError extends DetectionError {
  readonly code = DetectionErrorCode.IMAGE_LOAD_FAILED;
  readonly recoverable = false;

  constructor(
    public readonly imageSource: string,
    public readonly originalError?: Error
  ) {
    super(`Failed to load image: ${originalError?.message || "Unknown error"}`);
  }

  getUserMessage(): string {
    return "Could not load the image. Please try a different image.";
  }
}

/**
 * Canvas context not available
 */
export class CanvasContextError extends DetectionError {
  readonly code = DetectionErrorCode.CANVAS_CONTEXT_ERROR;
  readonly recoverable = false;

  constructor() {
    super("Failed to get 2D canvas context");
  }

  getUserMessage(): string {
    return "Browser canvas not available. Please try a different browser.";
  }
}

/**
 * Perspective warp failed
 */
export class WarpFailedError extends DetectionError {
  readonly code = DetectionErrorCode.WARP_FAILED;
  readonly recoverable = true;

  constructor(public readonly reason: string) {
    super(`Perspective warp failed: ${reason}`);
  }

  getUserMessage(): string {
    return "Could not correct card perspective. The card may not be fully visible.";
  }
}

// ============================================================================
// Result Pattern for Error Handling
// ============================================================================

/**
 * Success result
 */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/**
 * Error result
 */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/**
 * Result type - either success or error
 */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Create a success result
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * Create an error result
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Check if result is success
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

/**
 * Check if result is error
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

/**
 * Convert error to diagnostic object for logging
 */
export function errorToDiagnostic(
  error: DetectionError
): Record<string, unknown> {
  return {
    code: error.code,
    message: error.message,
    recoverable: error.recoverable,
    name: error.name,
  };
}
