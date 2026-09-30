import { sha256 } from "./crypto";
import type { Block, Transaction } from "../types";

/** Leaf hash of a single transaction. */
export function txHash(tx: Transaction): string {
  return sha256(
    JSON.stringify({
      id: tx.id,
      type: tx.type,
      from: tx.from,
      to: tx.to,
      amount: tx.amount,
      category: tx.category,
      timestamp: tx.timestamp,
    })
  );
}

/**
 * Compute the Merkle root of a list of transactions. Pairs of hashes are
 * concatenated and re-hashed up the tree until a single root remains — the same
 * construction Bitcoin uses to commit to a block's transactions compactly.
 */
export function computeMerkleRoot(transactions: Transaction[]): string {
  if (transactions.length === 0) return sha256("EMPTY");
  let level = transactions.map(txHash);
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left; // duplicate last if odd
      next.push(sha256(left + right));
    }
    level = next;
  }
  return level[0];
}

/**
 * Produce a Merkle proof (the sibling hashes) that a transaction at `index` is
 * included in a block, plus a boolean that re-derives the root to verify it.
 */
export function merkleProof(
  transactions: Transaction[],
  index: number
): { siblings: { hash: string; position: "left" | "right" }[]; root: string; valid: boolean } {
  const siblings: { hash: string; position: "left" | "right" }[] = [];
  let level = transactions.map(txHash);
  let idx = index;
  while (level.length > 1) {
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    const sibling = level[siblingIdx] ?? level[idx]; // duplicate if no pair
    siblings.push({ hash: sibling, position: isRight ? "left" : "right" });
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;
      next.push(sha256(left + right));
    }
    level = next;
    idx = Math.floor(idx / 2);
  }
  // Re-derive from the leaf to confirm the proof reaches the root.
  let running = txHash(transactions[index]);
  for (const s of siblings) {
    running = s.position === "left" ? sha256(s.hash + running) : sha256(running + s.hash);
  }
  return { siblings, root: level[0], valid: running === level[0] };
}

/** Deterministically compute a block's hash from its contents. */
export function computeBlockHash(block: Omit<Block, "hash">): string {
  const payload = JSON.stringify({
    index: block.index,
    timestamp: block.timestamp,
    merkleRoot: block.merkleRoot,
    previousHash: block.previousHash,
    nonce: block.nonce,
    difficulty: block.difficulty,
    minedBy: block.minedBy,
  });
  return sha256(payload);
}

/** A hash satisfies the proof-of-work target if it starts with `difficulty` zeros. */
export function meetsDifficulty(hash: string, difficulty: number): boolean {
  return hash.startsWith("0".repeat(difficulty));
}

export interface MineResult {
  block: Block;
  hashes: number; // how many hashes were tried
  ms: number; // wall-clock time
}

/**
 * Proof-of-work: increment the nonce until the block hash meets the difficulty
 * target (leading zeros). This is the same principle Bitcoin uses, scaled down.
 */
export function mineBlock(
  base: Omit<Block, "hash" | "nonce" | "merkleRoot">,
  difficulty: number
): MineResult {
  const start = Date.now();
  const merkleRoot = computeMerkleRoot(base.transactions);
  let nonce = 0;
  let hash = "";
  const MAX = 5_000_000; // safety cap so a mis-set difficulty can never hang a demo
  while (nonce < MAX) {
    hash = computeBlockHash({ ...base, merkleRoot, nonce, difficulty });
    if (meetsDifficulty(hash, difficulty)) break;
    nonce++;
  }
  return {
    block: { ...base, merkleRoot, nonce, difficulty, hash },
    hashes: nonce + 1,
    ms: Date.now() - start,
  };
}

/** Build the very first block of the chain. */
export function createGenesisBlock(): Block {
  const base: Omit<Block, "hash" | "nonce" | "merkleRoot"> = {
    index: 0,
    timestamp: Date.now(),
    transactions: [] as Transaction[],
    previousHash: "0".repeat(64),
    difficulty: 2,
    minedBy: "GENESIS",
  };
  const { block } = mineBlock(base, 2);
  return block;
}
