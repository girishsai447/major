"use client";

import type { Snapshot } from "./serialize";
import type { Category, Role, GenerationRecord, MintingBlock, AuditRecord, BurnRecord } from "./types";
import type { AuditVerificationResult } from "./blockchain/auditLedger";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 422) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  chain: () => jsonFetch<Snapshot>("/api/chain"),

  createWallet: (name: string, role: Role, institution?: string) =>
    jsonFetch<{ wallet: unknown; error?: string }>("/api/wallets", {
      method: "POST",
      body: JSON.stringify({ name, role, institution }),
    }),

  // Supervisor's block + puzzle + nonce + allocation record generation
  generateCoins: (studentId: string, amountCoins: number, governmentAuthorityId?: string) =>
    jsonFetch<{
      accepted: boolean;
      generationRecord?: GenerationRecord;
      mintingBlock?: MintingBlock;
      auditRecord?: AuditRecord;
      error?: string;
    }>("/api/mint", {
      method: "POST",
      body: JSON.stringify({ studentId, amountCoins, governmentAuthorityId }),
    }),

  // Expiry burn & atomic INR return
  burn: (generationId: string, governmentUserId?: string) =>
    jsonFetch<{
      success: boolean;
      burnRecord?: BurnRecord;
      auditRecord?: AuditRecord;
      error?: string;
    }>("/api/burn", {
      method: "POST",
      body: JSON.stringify({ generationId, governmentUserId }),
    }),

  // Audit chain verification
  verifyAudit: () => jsonFetch<AuditVerificationResult>("/api/audit/verify"),

  // Decrypt AES-256-GCM transaction payload
  decrypt: (ciphertext: string, iv: string, tag: string) =>
    jsonFetch<{ success: boolean; decrypted?: unknown; error?: string }>("/api/decrypt", {
      method: "POST",
      body: JSON.stringify({ ciphertext, iv, tag }),
    }),

  // Demo clock fast-forward
  setDemoClock: (params: { offsetDays?: number; reset?: boolean; targetDate?: string }) =>
    jsonFetch<{
      success: boolean;
      effectiveTime: number;
      effectiveDate: string;
      offsetMs: number;
    }>("/api/demo-clock", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  // Legacy wallet mint
  mint: (to: string, amount: number, memo?: string) =>
    jsonFetch<SubmitResponse>("/api/mint", {
      method: "POST",
      body: JSON.stringify({ to, amount, memo }),
    }),

  transfer: (
    from: string,
    to: string,
    amount: number,
    category: Category,
    memo?: string,
    coinIds?: string[]
  ) =>
    jsonFetch<SubmitResponse>("/api/transfer", {
      method: "POST",
      body: JSON.stringify({ from, to, amount, category, memo, coinIds }),
    }),

  mine: (minerName?: string) =>
    jsonFetch<{ block?: unknown; hashes?: number; ms?: number; error?: string }>(
      "/api/mine",
      { method: "POST", body: JSON.stringify({ minerName }) }
    ),

  validate: (input: {
    type?: "MINT" | "TRANSFER";
    from?: string | null;
    to: string;
    amount: number;
    category?: Category | null;
    coinIds?: string[];
  }) =>
    jsonFetch<ValidationResponse>("/api/validate", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  reset: (seed: boolean) =>
    jsonFetch<Snapshot>("/api/reset", {
      method: "POST",
      body: JSON.stringify({ seed }),
    }),

  depositReserve: (amount: number) =>
    jsonFetch<Snapshot>("/api/reserve", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),

  settle: (from: string, amount: number, coinIds?: string[]) =>
    jsonFetch<SubmitResponse>("/api/settle", {
      method: "POST",
      body: JSON.stringify({ from, amount, coinIds }),
    }),

  // 7-Point Cryptographic Coin Verification
  verifyCoins: (coinIds: string[], expectedOwner?: string, simulateTamper?: boolean) =>
    jsonFetch<
      import("./types").CoinBatchVerificationResult & { simulatedTamperApplied?: boolean }
    >("/api/coins/verify", {
      method: "POST",
      body: JSON.stringify({ coinIds, expectedOwner, simulateTamper }),
    }),

  // Query individual coins and batches
  getCoins: (params?: { owner?: string; batchId?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.owner) q.set("owner", params.owner);
    if (params?.batchId) q.set("batchId", params.batchId);
    if (params?.status) q.set("status", params.status);
    return jsonFetch<{
      total: number;
      batches: import("./types").CoinBatch[];
      coins: import("./types").EduCoinUnit[];
    }>(`/api/coins?${q.toString()}`);
  },

  clawback: (student: string) =>
    jsonFetch<SubmitResponse>("/api/clawback", {
      method: "POST",
      body: JSON.stringify({ student }),
    }),

  merkleProof: (blockIndex: number, txIndex: number) =>
    jsonFetch<MerkleProofResponse>("/api/merkle-proof", {
      method: "POST",
      body: JSON.stringify({ blockIndex, txIndex }),
    }),

  tamper: (blockIndex: number, txIndex: number, newAmount?: number) =>
    jsonFetch<{ tampered: unknown; snapshot: Snapshot }>("/api/tamper", {
      method: "POST",
      body: JSON.stringify({ blockIndex, txIndex, newAmount }),
    }),
};

export interface MerkleProofResponse {
  blockIndex: number;
  txIndex: number;
  leaf: string;
  merkleRoot: string;
  siblings: { hash: string; position: "left" | "right" }[];
  root: string;
  valid: boolean;
}

export interface ContractCheck {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface SubmitResponse {
  transaction: {
    id: string;
    type: "MINT" | "TRANSFER" | "SETTLE" | "CLAWBACK";
    from: string | null;
    to: string;
    amount: number;
    category: Category | null;
    status: string;
    rejectionReason?: string;
    contractChecks?: ContractCheck[];
    signature?: string;
    publicKey?: string;
  };
  accepted: boolean;
  reason?: string;
}

export interface ValidationResponse {
  ok: boolean;
  checks: ContractCheck[];
  reason?: string;
}
