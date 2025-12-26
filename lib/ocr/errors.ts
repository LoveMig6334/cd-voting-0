/**
 * Error handling system for the Image Processing Pipeline
 * Uses a Result pattern for type-safe error handling
 */

import type { DetectionMethod, ImageDimensions } from "./types";

/**
 * Error codes for categorizing detection failures
 */
export enum DetectionErrorCode {
  /** Image failed to load */
  IMAGE_LOAD_FAILED = "IMAGE_LOAD_FAILED",
  /** No quadrilateral shape found in image */
  NO_QUADRILATERAL_FOUND = "NO_QUADRILATERAL_FOUND",
  /** Detection confidence below threshold */
  LOW_CONFIDENCE = "LOW_CONFIDENCE",
  /** Detected shape has invalid aspect ratio */
  INVALID_ASPECT_RATIO = "INVALID_ASPECT_RATIO",
  /** Detected shape is too small */
  AREA_TOO_SMALL = "AREA_TOO_SMALL",
  /** Detected shape is too large */
  AREA_TOO_LARGE = "AREA_TOO_LARGE",
  /** Perspective warp calculation failed */
  WARP_FAILED = "WARP_FAILED",
  /** Matrix inversion failed (singular matrix) */
  SINGULAR_MATRIX = "SINGULAR_MATRIX",
  /** Canvas context not available */
  CANVAS_CONTEXT_ERROR = "CANVAS_CONTEXT_ERROR",
  /** Unknown or unexpected error */
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
    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get a user-friendly error message for UI display
   */
  abstract getUserMessage(): string;
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
    return "Could not load the image. Please try taking another photo.";
  }
}

/**
 * No quadrilateral found in the image
 */
export class NoQuadrilateralFoundError extends DetectionError {
  readonly code = DetectionErrorCode.NO_QUADRILATERAL_FOUND;
  readonly recoverable = true;

  constructor(
    public readonly contoursFound: number,
    public readonly imageDimensions: ImageDimensions
  ) {
    super(
      `No valid quadrilateral found. Found ${contoursFound} contours in ${imageDimensions.width}x${imageDimensions.height} image.`
    );
  }

  getUserMessage(): string {
    return "Could not detect a card shape. Please ensure the card is fully visible with good lighting.";
  }
}

/**
 * Detection confidence is below threshold
 */
export class LowConfidenceError extends DetectionError {
  readonly code = DetectionErrorCode.LOW_CONFIDENCE;
  readonly recoverable = true;

  constructor(
    public readonly confidence: number,
    public readonly threshold: number,
    public readonly method: DetectionMethod
  ) {
    super(
      `Detection confidence ${confidence.toFixed(
        1
      )}% is below threshold ${threshold}% using method: ${method}`
    );
  }

  getUserMessage(): string {
    return `Card detection confidence is low (${this.confidence.toFixed(
      0
    )}%). Try improving lighting or card positioning.`;
  }
}

/**
 * Detected shape has invalid aspect ratio
 */
export class InvalidAspectRatioError extends DetectionError {
  readonly code = DetectionErrorCode.INVALID_ASPECT_RATIO;
  readonly recoverable = true;

  constructor(
    public readonly detectedRatio: number,
    public readonly expectedRatio: number,
    public readonly tolerance: { min: number; max: number }
  ) {
    super(
      `Detected aspect ratio ${detectedRatio.toFixed(
        2
      )} is outside valid range [${tolerance.min}, ${
        tolerance.max
      }]. Expected ~${expectedRatio.toFixed(2)}.`
    );
  }

  getUserMessage(): string {
    return "The detected shape doesn't match an ID card. Please reposition the card.";
  }
}

/**
 * Detected area is outside valid bounds
 */
export class InvalidAreaError extends DetectionError {
  readonly code: DetectionErrorCode;
  readonly recoverable = true;

  constructor(
    public readonly detectedArea: number,
    public readonly imageArea: number,
    public readonly isTooSmall: boolean
  ) {
    const ratio = ((detectedArea / imageArea) * 100).toFixed(1);
    const issue = isTooSmall ? "too small" : "too large";
    super(`Detected area is ${issue}: ${ratio}% of image area.`);
    this.code = isTooSmall
      ? DetectionErrorCode.AREA_TOO_SMALL
      : DetectionErrorCode.AREA_TOO_LARGE;
  }

  getUserMessage(): string {
    if (this.isTooSmall) {
      return "The card appears too small in the image. Please move closer.";
    }
    return "The card appears too large in the image. Please move farther away.";
  }
}

/**
 * Perspective warp failed
 */
export class WarpFailedError extends DetectionError {
  readonly code = DetectionErrorCode.WARP_FAILED;
  readonly recoverable = true;

  constructor(
    public readonly reason: string,
    public readonly originalError?: Error
  ) {
    super(`Perspective warp failed: ${reason}`);
  }

  getUserMessage(): string {
    return "Could not correct the card perspective. Using fallback crop instead.";
  }
}

/**
 * Matrix inversion failed
 */
export class SingularMatrixError extends DetectionError {
  readonly code = DetectionErrorCode.SINGULAR_MATRIX;
  readonly recoverable = false;

  constructor(public readonly matrixDescription: string) {
    super(`Singular matrix encountered in ${matrixDescription}`);
  }

  getUserMessage(): string {
    return "A calculation error occurred. Please try a different image.";
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
    return "Browser does not support required canvas features.";
  }
}

/**
 * Result type for operations that can fail
 * Provides type-safe error handling without exceptions
 */
export type Result<T, E extends DetectionError = DetectionError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * Create a success result
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Create a failure result
 */
export function err<E extends DetectionError>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Check if result is success
 */
export function isOk<T, E extends DetectionError>(
  result: Result<T, E>
): result is { readonly ok: true; readonly value: T } {
  return result.ok;
}

/**
 * Check if result is failure
 */
export function isErr<T, E extends DetectionError>(
  result: Result<T, E>
): result is { readonly ok: false; readonly error: E } {
  return !result.ok;
}

/**
 * Unwrap a result, throwing if it's an error
 */
export function unwrap<T, E extends DetectionError>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwrap a result with a default value for errors
 */
export function unwrapOr<T, E extends DetectionError>(
  result: Result<T, E>,
  defaultValue: T
): T {
  if (result.ok) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Map over a successful result
 */
export function map<T, U, E extends DetectionError>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (result.ok) {
    return ok(fn(result.value));
  }
  return result;
}

/**
 * Map over a failed result's error
 */
export function mapErr<T, E extends DetectionError, F extends DetectionError>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (result.ok) {
    return result;
  }
  return err(fn(result.error));
}

/**
 * Chain results (flatMap)
 */
export function andThen<T, U, E extends DetectionError>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (result.ok) {
    return fn(result.value);
  }
  return result;
}

/**
 * Convert an error to a diagnostic object for logging/debugging
 */
export function errorToDiagnostic(error: DetectionError): {
  code: DetectionErrorCode;
  message: string;
  userMessage: string;
  recoverable: boolean;
  details: Record<string, unknown>;
} {
  const details: Record<string, unknown> = {};

  if (error instanceof ImageLoadError) {
    details.imageSource = error.imageSource;
  } else if (error instanceof NoQuadrilateralFoundError) {
    details.contoursFound = error.contoursFound;
    details.imageDimensions = error.imageDimensions;
  } else if (error instanceof LowConfidenceError) {
    details.confidence = error.confidence;
    details.threshold = error.threshold;
    details.method = error.method;
  } else if (error instanceof InvalidAspectRatioError) {
    details.detectedRatio = error.detectedRatio;
    details.expectedRatio = error.expectedRatio;
    details.tolerance = error.tolerance;
  } else if (error instanceof InvalidAreaError) {
    details.detectedArea = error.detectedArea;
    details.imageArea = error.imageArea;
    details.isTooSmall = error.isTooSmall;
  } else if (error instanceof WarpFailedError) {
    details.reason = error.reason;
  }

  return {
    code: error.code,
    message: error.message,
    userMessage: error.getUserMessage(),
    recoverable: error.recoverable,
    details,
  };
}
