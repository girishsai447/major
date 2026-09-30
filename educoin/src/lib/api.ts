"use client";

import type { Snapshot } from "./serialize";
import type { Category, Role } from "./types";

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
    memo?: string
  ) =>
    jsonFetch<SubmitResponse>("/api/transfer", {
      method: "POST",
      body: JSON.stringify({ from, to, amount, category, memo }),
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

  settle: (from: string, amount: number) =>
    jsonFetch<SubmitResponse>("/api/settle", {
      method: "POST",
      body: JSON.stringify({ from, amount }),
    }),

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
