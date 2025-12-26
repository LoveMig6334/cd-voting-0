/**
 * Type definitions for the Image Processing Pipeline
 */

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
 * Detection method used (for diagnostics)
 */
export type DetectionMethod =
  | "quadrilateral"
  | "edge_boundary"
  | "center_crop_portrait"
  | "center_crop_landscape";

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

/**
 * Processed image output containing all pipeline results
 */
export interface ProcessedImage {
  /** Base64 image with detection overlay */
  readonly originalWithOverlay: string;
  /** Base64 cropped and warped card */
  readonly croppedCard: string;
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
}

/**
 * Color mask result from color-based segmentation
 */
export interface ColorMaskResult {
  /** Binary mask of detected color pixels */
  readonly mask: Uint8Array;
  /** Number of pixels detected */
  readonly pixelCount: number;
}

/**
 * Edge detection result
 */
export interface EdgeDetectionResult {
  /** Binary edge mask */
  readonly edgeMask: Uint8Array;
  /** Image width */
  readonly width: number;
  /** Image height */
  readonly height: number;
}

/**
 * Contour representation
 */
export interface Contour {
  /** Points forming the contour */
  readonly points: readonly Point[];
  /** Area enclosed by contour (if closed) */
  readonly area?: number;
}

/**
 * Quadrilateral (4-point polygon) used for perspective warp
 */
export interface Quadrilateral {
  /** Top-left corner */
  readonly topLeft: Point;
  /** Top-right corner */
  readonly topRight: Point;
  /** Bottom-right corner */
  readonly bottomRight: Point;
  /** Bottom-left corner */
  readonly bottomLeft: Point;
}

/**
 * 3x3 matrix as flat array (row-major order)
 */
export type Matrix3x3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];

/**
 * Mutable version of Matrix3x3 for computation
 */
export type MutableMatrix3x3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];

/**
 * Homography matrix result
 */
export interface HomographyResult {
  /** The 3x3 homography matrix */
  readonly matrix: Matrix3x3;
  /** Inverse of the homography matrix */
  readonly inverse: Matrix3x3;
}

/**
 * Image data with dimensions
 */
export interface ImageDataWithDimensions {
  readonly imageData: ImageData;
  readonly width: number;
  readonly height: number;
}

/**
 * Perspective warp configuration
 */
export interface WarpConfig {
  /** Source corners (detected card corners) */
  readonly srcCorners: readonly Point[];
  /** Destination corners (output rectangle) */
  readonly dstCorners: readonly Point[];
  /** Output dimensions */
  readonly outputDimensions: ImageDimensions;
}

/**
 * Enhancement configuration
 */
export interface EnhancementConfig {
  /** Contrast multiplier (1.0 = no change) */
  readonly contrast: number;
  /** Brightness offset */
  readonly brightness: number;
}

/**
 * Create default processing options
 */
export function createDefaultProcessingOptions(): ProcessingOptions {
  return {
    enableCrop: true,
    enableEnhancement: true,
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

/**
 * Convert quadrilateral to array of points in order: TL, TR, BR, BL
 */
export function quadToPoints(quad: Quadrilateral): readonly Point[] {
  return [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft];
}

/**
 * Convert array of points to quadrilateral (expects TL, TR, BR, BL order)
 */
export function pointsToQuad(points: readonly Point[]): Quadrilateral | null {
  if (points.length !== 4) return null;
  return {
    topLeft: points[0],
    topRight: points[1],
    bottomRight: points[2],
    bottomLeft: points[3],
  };
}
