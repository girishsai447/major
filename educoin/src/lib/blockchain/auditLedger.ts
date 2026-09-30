import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { sha256 } from "./crypto";
import type { AuditRecord } from "../types";

export const GENESIS_AUDIT_HASH = "0".repeat(64);

const DEFAULT_SECRET = "educoin-super-secret-key-32bytes!!";

function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    if (envKey.length === 64) {
      return Buffer.from(envKey, "hex");
    }
    return createHash("sha256").update(envKey).digest();
  }
  return createHash("sha256").update(DEFAULT_SECRET).digest();
}

/**
 * Encrypt a transaction or generation record payload with AES-256-GCM.
 * Each encryption creates a unique random 96-bit IV.
 */
export function encryptRecordPayload(payload: unknown): {
  ciphertext: string;
  iv: string;
  tag: string;
  algorithm: "AES-256-GCM";
} {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const text = JSON.stringify(payload);
  let ciphertext = cipher.update(text, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return {
    ciphertext,
    iv: iv.toString("hex"),
    tag,
    algorithm: "AES-256-GCM",
  };
}

/**
 * Decrypt an AES-256-GCM encrypted payload.
 */
export function decryptRecordPayload<T = unknown>(encrypted: {
  ciphertext: string;
  iv: string;
  tag: string;
}): T {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(encrypted.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, "hex"));
  let decrypted = decipher.update(encrypted.ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted) as T;
}

/** Build canonical string representation of an audit record for hash chaining. */
export function canonicalAuditString(record: Omit<AuditRecord, "currentAuditHash" | "chainValid">): string {
  return [
    record.auditId,
    record.generationId,
    record.blockId,
    record.governmentUserId,
    record.studentId,
    record.instituteId,
    record.timestamp.toString(),
    record.reserveValue.toString(),
    record.coinsGenerated,
    record.coinsGeneratedDisplay.toString(),
    record.coinValue.toString(),
    record.studentExpiry.toString(),
    record.instituteExpiry.toString(),
    record.nonce.toString(),
    record.hash,
    record.eventType,
    record.previousAuditHash,
  ].join("|");
}

/** Calculate the hash for an audit entry, chained to the previous audit hash. */
export function computeAuditHash(record: Omit<AuditRecord, "currentAuditHash" | "chainValid">): string {
  const canonical = canonicalAuditString(record);
  return sha256(canonical);
}

export interface AuditVerificationResult {
  valid: boolean;
  totalRecords: number;
  brokenRecordId?: string;
  brokenIndex?: number;
  reason?: string;
}

/**
 * Verifies the integrity of the hash-chained audit ledger.
 * Walks from index 0 to N-1 and re-computes every link.
 */
export function verifyAuditChain(ledger: AuditRecord[]): AuditVerificationResult {
  if (ledger.length === 0) {
    return { valid: true, totalRecords: 0 };
  }

  for (let i = 0; i < ledger.length; i++) {
    const record = ledger[i];
    const expectedPrevHash = i === 0 ? GENESIS_AUDIT_HASH : ledger[i - 1].currentAuditHash;

    if (record.previousAuditHash !== expectedPrevHash) {
      return {
        valid: false,
        totalRecords: ledger.length,
        brokenRecordId: record.auditId,
        brokenIndex: i,
        reason: `Broken chain link at ${record.auditId} (record #${i + 1}): previousAuditHash mismatch. Expected ${expectedPrevHash}, found ${record.previousAuditHash}`,
      };
    }

    const recomputedCurrentHash = computeAuditHash(record);
    if (record.currentAuditHash !== recomputedCurrentHash) {
      return {
        valid: false,
        totalRecords: ledger.length,
        brokenRecordId: record.auditId,
        brokenIndex: i,
        reason: `Tampered record detected at ${record.auditId} (record #${i + 1}): hash recomputation failed. Expected ${recomputedCurrentHash}, found ${record.currentAuditHash}`,
      };
    }
  }

  return { valid: true, totalRecords: ledger.length };
}
