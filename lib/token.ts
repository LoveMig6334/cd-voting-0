/**
 * Vote Token Generation Library
 *
 * Generates unique, deterministic vote verification tokens based on
 * voter identity and timestamp.
 */

/**
 * Normalizes a name for consistent hashing.
 * Converts to uppercase and removes extra whitespace.
 */
function normalizeName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, " ");
}

/**
 * Simple hash function that works synchronously.
 * Uses a variant of djb2 algorithm combined with the timestamp.
 */
function hashInputs(name: string, timestamp: number): number {
  const input = `${name}:${timestamp}`;
  let hash = 5381;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) + hash + char) >>> 0; // hash * 33 + char (unsigned)
  }

  // Mix in the timestamp more thoroughly
  hash = ((hash ^ (timestamp >>> 16)) * 0x85ebca6b) >>> 0;
  hash = ((hash ^ (hash >>> 13)) * 0xc2b2ae35) >>> 0;
  hash = (hash ^ (hash >>> 16)) >>> 0;

  return hash;
}

/**
 * Encodes a number to a Base36 string of specified length.
 * Uses uppercase alphanumeric characters (0-9, A-Z).
 */
function toBase36(num: number, length: number): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";

  for (let i = 0; i < length; i++) {
    result = chars[num % 36] + result;
    num = Math.floor(num / 36);
  }

  return result;
}

/**
 * Generates a unique vote token based on the voter's name and the current time.
 *
 * @param name - The full name of the voter.
 * @param timestamp - The numeric timestamp of the vote (e.g., Date.now()).
 * @returns A formatted token string in the format VOTE-XXXX-XXXX.
 *
 * @example
 * const token = generateVoteToken("John Doe", 1703673600000);
 * // Returns something like "VOTE-A3K9-X2M1"
 */
export function generateVoteToken(name: string, timestamp: number): string {
  const normalizedName = normalizeName(name);

  // Generate two different hash values for the two parts of the token
  const hash1 = hashInputs(normalizedName, timestamp);
  const hash2 = hashInputs(normalizedName + ":salt", timestamp ^ 0xdeadbeef);

  // Convert to 4-character Base36 strings
  const part1 = toBase36(hash1, 4);
  const part2 = toBase36(hash2, 4);

  return `VOTE-${part1}-${part2}`;
}

/**
 * Validates that a token matches the expected format.
 *
 * @param token - The token string to validate.
 * @returns True if the token matches the VOTE-XXXX-XXXX format.
 */
export function isValidTokenFormat(token: string): boolean {
  const pattern = /^VOTE-[0-9A-Z]{4}-[0-9A-Z]{4}$/;
  return pattern.test(token);
}
