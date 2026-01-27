import { generateVoteToken, isValidTokenFormat } from "@/lib/token";

describe("generateVoteToken", () => {
  const TOKEN_PATTERN = /^VOTE-[0-9A-Z]{4}-[0-9A-Z]{4}$/;

  it("returns a token in VOTE-XXXX-XXXX format", () => {
    const token = generateVoteToken("John Doe", 1703673600000);
    expect(token).toMatch(TOKEN_PATTERN);
  });

  it("is deterministic — same inputs always produce the same token", () => {
    const a = generateVoteToken("Jane Smith", 1700000000000);
    const b = generateVoteToken("Jane Smith", 1700000000000);
    expect(a).toBe(b);
  });

  it("produces different tokens for different names", () => {
    const ts = 1703673600000;
    const tokenA = generateVoteToken("Alice", ts);
    const tokenB = generateVoteToken("Bob", ts);
    expect(tokenA).not.toBe(tokenB);
  });

  it("produces different tokens for different timestamps", () => {
    const tokenA = generateVoteToken("Alice", 1000000000000);
    const tokenB = generateVoteToken("Alice", 1000000000001);
    expect(tokenA).not.toBe(tokenB);
  });

  it("normalizes name casing — uppercase and lowercase produce the same token", () => {
    const ts = 1703673600000;
    const lower = generateVoteToken("john doe", ts);
    const upper = generateVoteToken("JOHN DOE", ts);
    const mixed = generateVoteToken("John Doe", ts);
    expect(lower).toBe(upper);
    expect(upper).toBe(mixed);
  });

  it("normalizes whitespace — extra spaces are collapsed", () => {
    const ts = 1703673600000;
    const normal = generateVoteToken("John Doe", ts);
    const extraSpaces = generateVoteToken("  John   Doe  ", ts);
    expect(normal).toBe(extraSpaces);
  });

  it("handles an empty name string without throwing", () => {
    expect(() => generateVoteToken("", 1703673600000)).not.toThrow();
    expect(generateVoteToken("", 1703673600000)).toMatch(TOKEN_PATTERN);
  });

  it("handles a very long name", () => {
    const longName = "A".repeat(1000);
    const token = generateVoteToken(longName, 1703673600000);
    expect(token).toMatch(TOKEN_PATTERN);
  });

  it("handles special characters in name", () => {
    const token = generateVoteToken("José María García-López", 1703673600000);
    expect(token).toMatch(TOKEN_PATTERN);
  });

  it("handles timestamp of zero", () => {
    const token = generateVoteToken("Test", 0);
    expect(token).toMatch(TOKEN_PATTERN);
  });
});

describe("isValidTokenFormat", () => {
  it("accepts a well-formed token", () => {
    expect(isValidTokenFormat("VOTE-A3K9-X2M1")).toBe(true);
  });

  it("accepts tokens produced by generateVoteToken", () => {
    const token = generateVoteToken("Alice", 1703673600000);
    expect(isValidTokenFormat(token)).toBe(true);
  });

  it("accepts tokens with all digits", () => {
    expect(isValidTokenFormat("VOTE-1234-5678")).toBe(true);
  });

  it("accepts tokens with all letters", () => {
    expect(isValidTokenFormat("VOTE-ABCD-EFGH")).toBe(true);
  });

  it("rejects lowercase letters", () => {
    expect(isValidTokenFormat("VOTE-abcd-efgh")).toBe(false);
  });

  it("rejects wrong prefix", () => {
    expect(isValidTokenFormat("TOKEN-A3K9-X2M1")).toBe(false);
  });

  it("rejects missing prefix", () => {
    expect(isValidTokenFormat("A3K9-X2M1")).toBe(false);
  });

  it("rejects segments that are too short", () => {
    expect(isValidTokenFormat("VOTE-A3K-X2M")).toBe(false);
  });

  it("rejects segments that are too long", () => {
    expect(isValidTokenFormat("VOTE-A3K9X-X2M1Z")).toBe(false);
  });

  it("rejects special characters in segments", () => {
    expect(isValidTokenFormat("VOTE-A3K!-X2M1")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidTokenFormat("")).toBe(false);
  });

  it("rejects extra dashes", () => {
    expect(isValidTokenFormat("VOTE-A3K9-X2M1-ZZZZ")).toBe(false);
  });

  it("rejects missing dash separator", () => {
    expect(isValidTokenFormat("VOTEA3K9X2M1")).toBe(false);
  });
});
