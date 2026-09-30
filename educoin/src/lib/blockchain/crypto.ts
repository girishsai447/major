import {
  createHash,
  randomBytes,
  generateKeyPairSync,
  sign as nodeSign,
  verify as nodeVerify,
  createPrivateKey,
  createPublicKey,
} from "crypto";

/** SHA-256 hex digest of an arbitrary string. */
export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Short random hex id used for transaction ids. */
export function randomId(bytes = 8): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Generate a pseudo blockchain wallet address.
 * Deterministic-looking (0x + 40 hex chars) to feel authentic in demos.
 */
export function makeAddress(seed?: string): string {
  const source = (seed ?? "") + randomBytes(16).toString("hex");
  return "0x" + sha256(source).slice(0, 40);
}

/**
 * A real Ed25519 key pair for a wallet. The address is derived by hashing the
 * public key — exactly as public blockchains derive addresses from keys.
 */
export interface KeyPair {
  publicKey: string; // PEM
  privateKey: string; // PEM
  address: string; // 0x + 40 hex, derived from the public key
}

export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const address = "0x" + sha256(publicKey).slice(0, 40);
  return { publicKey, privateKey, address };
}

/** Sign a message with an Ed25519 private key (PEM). Returns a hex signature. */
export function signMessage(privateKeyPem: string, message: string): string {
  const key = createPrivateKey(privateKeyPem);
  const sig = nodeSign(null, Buffer.from(message), key);
  return sig.toString("hex");
}

/** Verify an Ed25519 signature (hex) against a public key (PEM). */
export function verifySignature(
  publicKeyPem: string,
  message: string,
  signatureHex: string
): boolean {
  try {
    const key = createPublicKey(publicKeyPem);
    return nodeVerify(null, Buffer.from(message), key, Buffer.from(signatureHex, "hex"));
  } catch {
    return false;
  }
}

/** The canonical payload that gets signed for a transaction. */
export function txSigningPayload(tx: {
  type: string;
  from: string | null;
  to: string;
  amount: number;
  category: string | null;
  timestamp: number;
}): string {
  return JSON.stringify({
    type: tx.type,
    from: tx.from,
    to: tx.to,
    amount: tx.amount,
    category: tx.category,
    timestamp: tx.timestamp,
  });
}
