# Plan: Vote Token Generation Library

This document outlines the requirements and implementation steps for a custom library designed to generate unique vote verification tokens.

## 1. Context

Currently, the `vote-success` page (`app/(student)/vote-success/page.tsx`) displays a placeholder token `VOTE-9SG2-XQ11`. To ensure the integrity and verifiability of the voting process, we need a library that generates a unique, deterministic token for each voter based on their identity and the time of their vote.

## 2. Requirements

- **Inputs**: Voter's full name (string) and the timestamp of the vote (number/Date).
- **Output**: A unique, consistent, and human-readable token string.
- **Location**: The library code should reside in `lib/token.ts`.
- **Format**: The token should follow a recognizable format, such as `VOTE-XXXX-XXXX`, where `XXXX` are alphanumeric characters derived from the inputs.

## 3. Technical Specifications

### Library: `lib/token.ts`

The library should export a primary function:

```typescript
/**
 * Generates a unique vote token based on the voter's name and the current time.
 * @param name - The full name of the voter.
 * @param timestamp - The numeric timestamp of the vote.
 * @returns A formatted token string.
 */
export function generateVoteToken(name: string, timestamp: number): string;
```

### Proposed Algorithm

1.  **Normalization**: Convert the name to uppercase and remove extra whitespace.
2.  **Hashing**: Use a stable hashing algorithm (e.g., a simple custom hash or SHA-256 via `crypto.subtle`) to combine the name and timestamp.
3.  **Encoding**: Encode a portion of the hash into a Base36 or Hexadecimal string to keep it short and readable.
4.  **Formatting**: Insert hyphens for readability (e.g., `VOTE-ABCD-1234`).

## 4. Implementation Steps for AI Coder

### Step 1: Create the Library

- [ ] Initialize `lib/token.ts`.
- [ ] Implement the `generateVoteToken` function using the logic above.
- [ ] (Optional) Add a salt or secret key if the token needs to be cryptographically secure against brute-force guessing of names.

### Step 2: Integrate into Vote Success Page

- [ ] Open `app/(student)/vote-success/page.tsx`.
- [ ] Import `generateVoteToken` from `@/lib/token`.
- [ ] Capture the current timestamp or receive it from the voting state.
- [ ] Replace the hardcoded `VOTE-9SG2-XQ11` with a call to the generator:
  ```tsx
  const token = generateVoteToken(studentName, Date.now());
  ```

### Step 3: Verification

- [ ] Verify that the same name and timestamp always produce the same token.
- [ ] Verify that different names or different timestamps produce unique tokens.
- [ ] Ensure the UI renders the generated token correctly.

## 5. Security & Uniqueness Considerations

- The token should be unique enough to avoid collisions within a single election cycle.
- Using `Date.now()` provides millisecond precision, which significantly reduces the risk of collisions for the same user.
- For enhanced privacy, the name could be hashed before being combined with the timestamp to avoid direct reverse-engineering of the voter's identity from the token (though the token ID is typically public).
