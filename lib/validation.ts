/**
 * Input validation utilities for student and admin data.
 *
 * Student ID: exactly 4 digits (e.g. "1234")
 * National ID: exactly 13 digits (Thai national ID, e.g. "1234567890123")
 */

const STUDENT_ID_REGEX = /^\d{4}$/;
const NATIONAL_ID_REGEX = /^\d{13}$/;

/**
 * Validate that a Student ID is exactly 4 digits.
 */
export function isValidStudentId(id: string): boolean {
  return STUDENT_ID_REGEX.test(id);
}

/**
 * Validate that a National ID is exactly 13 digits.
 */
export function isValidNationalId(id: string): boolean {
  return NATIONAL_ID_REGEX.test(id);
}

/**
 * Sanitize a text input by trimming whitespace and stripping control characters.
 * Returns the cleaned string.
 */
export function sanitizeInput(input: string): string {
  // Remove ASCII control characters (0x00–0x1F except common whitespace) and DEL (0x7F)
  return input.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}
