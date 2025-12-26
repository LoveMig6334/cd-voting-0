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
    confidence: { id: 0, name: 0, surname: 0, classroom: 0, no: 0, nationalId: 0 },
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
  extractNationalId(lines, result);

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
  // Student IDs are 4-digit numbers on Thai student ID cards
  // Located near "เลขประจำตัว" or "Student ID" labels
  const idPatterns = [
    // Exact label match with Thai "เลขประจำตัว" (highest confidence)
    /เลขประจำตัว(?:นักเรียน)?[:\s]*(\d{4,5})/i,
    // English "Student ID" label
    /Student\s*ID[:\s]*(\d{4,5})/i,
    // Thai "รหัส" or "รหัสนักเรียน"
    /รหัส(?:นักเรียน)?[:\s]*(\d{4,5})/i,
    // Standalone 4-digit number starting with 6 or 7 (typical range)
    /(?:^|\s)([67]\d{3})(?:\s|$)/,
    // Any isolated 4-digit number as fallback
    /(?:^|\s)(\d{4})(?:\s|$)/,
  ];

  const confidenceScores = [100, 95, 90, 70, 50];

  for (const line of lines) {
    // Skip lines that look like national ID (13 digits with spaces)
    if (/\d[\s-]?\d{4}[\s-]?\d{5}[\s-]?\d{2}[\s-]?\d/.test(line)) continue;

    for (let i = 0; i < idPatterns.length; i++) {
      const match = line.match(idPatterns[i]);
      if (match) {
        const id = parseInt(match[1], 10);
        // Validate: 4-digit student IDs typically in range 1000-9999
        if (id >= 1000 && id <= 9999) {
          result.id = id;
          result.confidence.id = confidenceScores[i];
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
  // Thai names: look for lines with Thai characters
  // Format on Thai ID cards: "ชื่อ-สกุล นายธรรศ บุนนาค" or "Name นายธรรศ บุนนาค"
  const thaiPattern = /[\u0E00-\u0E7F]+/g;

  // Title prefixes to strip from name
  const titlePrefixes = /^(?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.)/;

  for (const line of lines) {
    // Skip lines with numbers (likely ID or classroom) unless it has name keywords
    const hasNameKeyword = /(?:ชื่อ|สกุล|name)/i.test(line);
    if (/\d/.test(line) && !hasNameKeyword) continue;

    // Pattern 1: "ชื่อ-สกุล" followed by title + name + surname (highest confidence)
    const fullNameMatch = line.match(
      /ชื่อ[-\s]*สกุล[:\s]*((?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.)?[\u0E00-\u0E7F]+)\s+([\u0E00-\u0E7F\s]+)/
    );
    if (fullNameMatch) {
      let name = fullNameMatch[1].trim();
      // Remove title prefix from name
      name = name.replace(titlePrefixes, "").trim();
      result.name = name;
      result.surname = fullNameMatch[2].trim();
      result.confidence.name = 100;
      result.confidence.surname = 100;
      return;
    }

    // Pattern 2: English "Name" label
    const englishNameMatch = line.match(
      /Name[:\s]*((?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง)?[\u0E00-\u0E7F]+)\s+([\u0E00-\u0E7F\s]+)/i
    );
    if (englishNameMatch) {
      let name = englishNameMatch[1].trim();
      name = name.replace(titlePrefixes, "").trim();
      result.name = name;
      result.surname = englishNameMatch[2].trim();
      result.confidence.name = 95;
      result.confidence.surname = 95;
      return;
    }

    // Pattern 3: Just "ชื่อ" (name only) followed by Thai text
    const nameOnlyMatch = line.match(
      /ชื่อ[:\s]*((?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง)?[\u0E00-\u0E7F]+)/
    );
    if (nameOnlyMatch && !result.name) {
      let name = nameOnlyMatch[1].trim();
      name = name.replace(titlePrefixes, "").trim();
      result.name = name;
      result.confidence.name = 80;
    }

    // Pattern 4: "สกุล" (surname) separately
    const surnameOnlyMatch = line.match(/สกุล[:\s]*([\u0E00-\u0E7F\s]+)/);
    if (surnameOnlyMatch && !result.surname) {
      result.surname = surnameOnlyMatch[1].trim();
      result.confidence.surname = 80;
    }

    // Pattern 5: Title prefix followed by name and surname (e.g., "นายธรรศ บุนนาค")
    const titleMatch = line.match(
      /(?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.)([\u0E00-\u0E7F]+)\s+([\u0E00-\u0E7F\s]+)/
    );
    if (titleMatch && !result.name) {
      result.name = titleMatch[1].trim();
      result.surname = titleMatch[2].trim();
      result.confidence.name = 70;
      result.confidence.surname = 70;
      return;
    }
  }

  // Fallback: find lines with only Thai characters (likely name surname format)
  if (!result.name) {
    for (const line of lines) {
      // Skip lines with numbers
      if (/\d/.test(line)) continue;

      const thaiMatches = line.match(thaiPattern);
      if (thaiMatches && thaiMatches.length >= 2) {
        // First Thai word as name, second as surname
        result.name = thaiMatches[0];
        result.surname = thaiMatches[1];
        result.confidence.name = 50;
        result.confidence.surname = 50;
        return;
      }
    }
  }
}

/**
 * Extract Thai National ID (Citizen ID) - 13 digit number
 * Format: X XXXX XXXXX XX X (with spaces/dashes between groups)
 * Example: 1 1007 04166 24 8
 */
function extractNationalId(lines: string[], result: ParseResult): void {
  // Patterns for 13-digit Thai national ID
  const nationalIdPatterns = [
    // With "เลขประจำตัวประชาชน" label (highest confidence)
    /เลขประจำตัวประชาชน[:\s]*([\d\s-]{13,20})/,
    // With "Citizen ID" or "ID Card" label
    /(?:Citizen\s*ID|ID\s*Card|National\s*ID)[:\s]*([\d\s-]{13,20})/i,
    // Standard format with spaces: X XXXX XXXXX XX X
    /(\d[\s-]?\d{4}[\s-]?\d{5}[\s-]?\d{2}[\s-]?\d)/,
    // Continuous 13 digits
    /(\d{13})/,
  ];

  const confidenceScores = [100, 95, 85, 70];

  for (const line of lines) {
    for (let i = 0; i < nationalIdPatterns.length; i++) {
      const match = line.match(nationalIdPatterns[i]);
      if (match) {
        // Clean up: remove spaces and dashes, keep only digits
        const cleanId = match[1].replace(/[\s-]/g, "");

        // Validate: must be exactly 13 digits
        if (/^\d{13}$/.test(cleanId)) {
          // Format nicely: X XXXX XXXXX XX X
          result.nationalId = formatNationalId(cleanId);
          result.confidence.nationalId = confidenceScores[i];
          return;
        }
      }
    }
  }
}

/**
 * Format 13-digit national ID into standard display format
 * Input: 1100704166248
 * Output: 1 1007 04166 24 8
 */
function formatNationalId(id: string): string {
  if (id.length !== 13) return id;
  return `${id[0]} ${id.slice(1, 5)} ${id.slice(5, 10)} ${id.slice(10, 12)} ${id[12]}`;
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
