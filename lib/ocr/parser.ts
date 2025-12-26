import { StudentData } from "../student-data";

export interface ParseResult extends Partial<StudentData> {
  nationalId?: string;
  confidence: {
    id: number;
    name: number;
    surname: number;
    classroom: number;
    no: number;
    nationalId: number;
  };
}

/**
 * Parses raw text extracted from an OCR engine (like Tesseract.js)
 * into a structured StudentData object.
 *
 * Target format on Thai Student ID cards:
 * - Student ID: 4-5 digit number (e.g., 6334, 7160)
 * - Name: Thai first name
 * - Surname: Thai last name
 * - Classroom: Format X/Y (e.g., 3/1, 3/2, 3/3)
 * - No: Student number in class (1-30 typically)
 */
export function parseOCRText(text: string): ParseResult {
  const result: ParseResult = {
    confidence: { id: 0, name: 0, surname: 0, classroom: 0, no: 0 },
  };

  // Normalize text: handle common OCR misreads
  const normalizedText = normalizeOCRText(text);
  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Extract each field
  extractStudentId(lines, result);
  extractClassroom(lines, result);
  extractStudentNo(lines, result);
  extractName(lines, result);

  return result;
}

function normalizeOCRText(text: string): string {
  return (
    text
      // Common OCR misreads for numbers
      .replace(/[oO]/g, "0")
      .replace(/[lI]/g, "1")
      // Thai character normalization
      .replace(/\u0E33/g, "\u0E32\u0E4D") // Normalize Sara Am
      // Remove extra whitespace
      .replace(/\s+/g, " ")
  );
}

function extractStudentId(lines: string[], result: ParseResult): void {
  // Student IDs are 4-5 digit numbers, typically starting with 6 or 7 for current students
  const idPatterns = [
    /(?:เลขประจำตัว|รหัส(?:นักเรียน)?|ID|Student\s*ID)[:\s]*(\d{4,5})/i,
    /(?:^|\s)([67]\d{3,4})(?:\s|$)/, // IDs starting with 6 or 7
    /(\d{4,5})/, // Fallback: any 4-5 digit number
  ];

  for (const line of lines) {
    for (let i = 0; i < idPatterns.length; i++) {
      const match = line.match(idPatterns[i]);
      if (match) {
        const id = parseInt(match[1], 10);
        // Validate ID range (typical school IDs are 4-5 digits)
        if (id >= 1000 && id <= 99999) {
          result.id = id;
          result.confidence.id = 100 - i * 20; // Higher confidence for earlier patterns
          return;
        }
      }
    }
  }
}

function extractClassroom(lines: string[], result: ParseResult): void {
  // Classroom format: X/Y (e.g., 3/1, 3/2, ม.3/1)
  const classroomPatterns = [
    /(?:ชั้น|ห้อง|ม\.|class(?:room)?)[:\s]*(\d\/\d+)/i,
    /(?:^|\s)(\d\/\d+)(?:\s|$)/, // Standalone X/Y format
  ];

  for (const line of lines) {
    for (let i = 0; i < classroomPatterns.length; i++) {
      const match = line.match(classroomPatterns[i]);
      if (match) {
        result.classroom = match[1];
        result.confidence.classroom = 100 - i * 30;
        return;
      }
    }
  }
}

function extractStudentNo(lines: string[], result: ParseResult): void {
  // Student number in class: typically 1-30
  const noPatterns = [
    /(?:เลขที่|ลำดับ|No\.?)[:\s]*(\d{1,2})/i,
    /(?:^|\s)#(\d{1,2})(?:\s|$)/,
  ];

  for (const line of lines) {
    for (let i = 0; i < noPatterns.length; i++) {
      const match = line.match(noPatterns[i]);
      if (match) {
        const no = parseInt(match[1], 10);
        if (no >= 1 && no <= 50) {
          result.no = no;
          result.confidence.no = 100 - i * 30;
          return;
        }
      }
    }
  }
}

function extractName(lines: string[], result: ParseResult): void {
  // Thai names: look for lines with Thai characters and no numbers
  const thaiPattern = /[\u0E00-\u0E7F]+/g;
  const nameKeywords = /(?:ชื่อ|นาย|นางสาว|เด็กชาย|เด็กหญิง|name)/i;

  for (const line of lines) {
    // Skip lines with numbers (likely ID or classroom)
    if (/\d/.test(line) && !nameKeywords.test(line)) continue;

    // Look for name keyword followed by Thai text
    const keywordMatch = line.match(
      /(?:ชื่อ|นาย|นางสาว|เด็กชาย|เด็กหญิง)[:\s]*([\u0E00-\u0E7F]+)\s+([\u0E00-\u0E7F\s]+)/
    );
    if (keywordMatch) {
      result.name = keywordMatch[1].trim();
      result.surname = keywordMatch[2].trim();
      result.confidence.name = 90;
      result.confidence.surname = 90;
      return;
    }

    // Fallback: line with only Thai characters (likely name surname format)
    const thaiMatches = line.match(thaiPattern);
    if (thaiMatches && thaiMatches.length >= 2 && !result.name) {
      // First Thai word as name, rest as surname
      result.name = thaiMatches[0];
      result.surname = thaiMatches.slice(1).join(" ");
      result.confidence.name = 60;
      result.confidence.surname = 60;
    }
  }
}

/**
 * Validates parsed OCR data against the student database
 */
export async function validateParsedData(
  parsed: Partial<StudentData>
): Promise<{
  isValid: boolean;
  matchedStudent: StudentData | null;
  matchType: "exact" | "partial" | "none";
}> {
  if (!parsed.id) {
    return { isValid: false, matchedStudent: null, matchType: "none" };
  }

  try {
    const response = await fetch("/data.json");
    if (!response.ok) {
      return { isValid: false, matchedStudent: null, matchType: "none" };
    }

    const students: StudentData[] = await response.json();
    const matchedStudent = students.find((s) => s.id === parsed.id);

    if (!matchedStudent) {
      return { isValid: false, matchedStudent: null, matchType: "none" };
    }

    // Check if other fields also match
    const nameMatch = parsed.name === matchedStudent.name;
    const surnameMatch = parsed.surname === matchedStudent.surname;
    const classroomMatch = parsed.classroom === matchedStudent.classroom;

    const isExactMatch = nameMatch && surnameMatch && classroomMatch;

    return {
      isValid: true,
      matchedStudent,
      matchType: isExactMatch ? "exact" : "partial",
    };
  } catch {
    return { isValid: false, matchedStudent: null, matchType: "none" };
  }
}
