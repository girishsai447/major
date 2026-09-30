import { sha256 } from "./crypto";

export interface PuzzleParameters {
  generationTimestamp: number;
  studentId: string;
  studentAcademicCompletionDate: number;
  studentCoinExpiry: number;
  instituteId: string;
  instituteExpiry: number;
  reserveValue: number;
  coinValue: number;
  numberOfCoinsGenerated: string; // 18-decimal base units or whole amount
  governmentAuthorityId: string;
}

export interface PuzzleSolution {
  nonce: number;
  hash: string;
  puzzleInput: string;
  iterations: number;
  durationMs: number;
}

/**
 * Builds the canonical puzzle string according to supervisor specification:
 * Generation Timestamp + Student Info + Student Expiry + Institute ID +
 * Institute Expiry + Reserve Value + Coin Value + Number of Coins + Nonce
 */
export function buildPuzzleString(params: PuzzleParameters, nonce: number): string {
  return [
    `TIMESTAMP:${params.generationTimestamp}`,
    `STUDENT:${params.studentId}`,
    `STUDENT_EXPIRY:${params.studentCoinExpiry}`,
    `INSTITUTE:${params.instituteId}`,
    `INSTITUTE_EXPIRY:${params.instituteExpiry}`,
    `RESERVE_INR:${params.reserveValue}`,
    `COIN_VALUE_INR:${params.coinValue}`,
    `COINS:${params.numberOfCoinsGenerated}`,
    `GOVT_AUTH:${params.governmentAuthorityId}`,
    `NONCE:${nonce}`,
  ].join("|");
}

/** Check whether hash meets target difficulty (e.g. leading zeros). */
export function meetsPuzzleDifficulty(hash: string, difficulty: number): boolean {
  const prefix = "0".repeat(Math.max(1, difficulty));
  return hash.startsWith(prefix);
}

/**
 * Solves the coin generation puzzle by repeatedly incrementing nonce:
 * nonce = nonce + 1 until puzzle hash satisfies difficulty.
 */
export function solvePuzzle(
  params: PuzzleParameters,
  difficulty = 3,
  startNonce = 0
): PuzzleSolution {
  const start = Date.now();
  let nonce = startNonce;
  let iterations = 0;

  while (true) {
    iterations++;
    const puzzleInput = buildPuzzleString(params, nonce);
    const hash = sha256(puzzleInput);

    if (meetsPuzzleDifficulty(hash, difficulty)) {
      return {
        nonce,
        hash,
        puzzleInput,
        iterations,
        durationMs: Date.now() - start,
      };
    }

    nonce++;
  }
}
