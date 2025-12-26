import { StudentData } from "../student-data";

/**
 * Parses raw text extracted from an OCR engine (like Tesseract.js)
 * into a structured StudentData object.
 *
 * Target format example:
 * ID: 6334
 * Name: ธรรศ
 * Surname: บุนนาค
 * Classroom: 3/3
 * No: 5
 */
export function parseOCRText(text: string): Partial<StudentData> {
  const result: Partial<StudentData> = {};

  // Normalize text: remove extra spaces, handle common OCR misreads
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Regex patterns (to be refined during debug phase)
  const idPattern = /(\d{4,5})/; // Looking for 4-5 digit ID
  const classroomPattern = /(\d\/\d+)/; // Looking for X/Y format

  // Basic extraction logic
  for (const line of lines) {
    // Try to find ID
    if (!result.id) {
      const idMatch = line.match(idPattern);
      if (idMatch) result.id = parseInt(idMatch[1], 10);
    }

    // Try to find Classroom
    if (!result.classroom) {
      const classMatch = line.match(classroomPattern);
      if (classMatch) result.classroom = classMatch[1];
    }

    // Heuristic for name/surname (often appearing together)
    // This is placeholder logic to be tested in the debug window
    if (!result.name && line.length > 2 && !line.match(/\d/)) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        result.name = parts[0];
        result.surname = parts.slice(1).join(" ");
      }
    }
  }

  return result;
}
