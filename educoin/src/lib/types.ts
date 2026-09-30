/**
 * Shared domain types for the EduCoin blockchain.
 * These are safe to import from both server and client code.
 */

export type Role = "GOVERNMENT" | "INSTITUTION" | "STUDENT" | "VENDOR";

export type Category =
  | "TUITION"
  | "EXAMINATION"
  | "HOSTEL"
  | "BOOKS"
  | "ISSUANCE"
  | "SETTLEMENT"
  | "CLAWBACK";

export type TxType = "MINT" | "TRANSFER" | "SETTLE" | "CLAWBACK";

export type TxStatus = "PENDING" | "CONFIRMED" | "REJECTED";

export interface ContractCheck {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface Transaction {
  id: string;
  type: TxType;
  from: string | null; // wallet address; null for MINT (issued from Treasury)
  to: string; // wallet address
  amount: number;
  category: Category | null;
  memo?: string;
  timestamp: number;
  status: TxStatus;
  rejectionReason?: string;
  contractChecks?: ContractCheck[];
  blockIndex?: number; // set once mined into a block
  signature?: string; // Ed25519 signature by the sender's wallet
  publicKey?: string; // sender's public key (for verification)
  expiresAt?: number; // for MINT: end of the scholarship's validity term
  studentId?: string;
  academicLevel?: string;
  academicCompletionDate?: number;
  instituteExpiryAt?: number;
  generationId?: string;
}

export interface Wallet {
  address: string;
  name: string;
  role: Role;
  institution?: string; // for students: their college
  studentId?: string;
  academicLevel?: string;
  academicCompletionDate?: number;
  createdAt: number;
  publicKey: string; // Ed25519 public key (PEM)
  privateKey?: string; // Ed25519 private key (PEM) — server-only, never serialized
}

export interface Block {
  index: number;
  timestamp: number;
  transactions: Transaction[];
  previousHash: string;
  hash: string;
  nonce: number;
  difficulty: number;
  minedBy: string;
  merkleRoot: string; // Merkle root of the block's transactions
}

// -----------------------------------------------------------------------------
// New Domain Models: Students, Minting Blocks, Generation Records, Burns, Audits
// -----------------------------------------------------------------------------

export interface StudentRecord {
  studentId: string; // e.g. STU001
  name: string;
  instituteId: string; // e.g. INST-VNR
  instituteName: string;
  academicLevel: string; // e.g. "3rd Year"
  academicCompletionDate: number; // Unix timestamp in ms
  walletAddress?: string | null;
}

export interface MintingBlock {
  blockId: string; // MBLK-00001
  previousBlockHash: string;
  generationTimestamp: number;
  studentId: string;
  instituteId: string;
  studentAcademicCompletionDate: number;
  studentCoinExpiry: number;
  instituteExpiry: number;
  reserveValue: number; // in INR
  coinValue: number; // 100
  numberOfCoinsGenerated: string; // 18-decimal base units string
  numberOfCoinsDisplay: number;
  nonce: number;
  hash: string;
  governmentAuthorityId: string;
  puzzleInput: string;
}

export type GenerationStatus =
  | "GENERATED"
  | "PARTIALLY_USED"
  | "STUDENT_EXPIRED"
  | "INSTITUTE_EXPIRED"
  | "BURNED";

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
  algorithm: "AES-256-GCM";
}

export interface GenerationRecord {
  generationId: string; // GEN00001
  blockId: string;
  studentId: string;
  studentName: string;
  instituteId: string;
  instituteName: string;
  academicLevel: string;
  coinsGenerated: string; // 18-decimal base units string
  coinsRemaining: string; // 18-decimal base units string
  coinsBurned: string; // 18-decimal base units string
  coinsDisplay: number;
  coinValue: number; // 100
  totalValue: number; // in INR
  studentExpiry: number;
  instituteExpiry: number;
  status: GenerationStatus;
  walletStatus: "NOT LINKED" | "LINKED";
  walletAddress?: string | null;
  generationTimestamp: number;
  burnTimestamp?: number;
  inrReturned?: number;
  nonce: number;
  hash: string;
  governmentAuthorityId: string;
  encryptedPayload?: EncryptedPayload;
}

export interface BurnRecord {
  burnId: string; // BRN00001
  generationId: string;
  studentId: string;
  studentName: string;
  instituteId: string;
  expiryType: "STUDENT" | "INSTITUTE";
  expiryDate: number;
  coinsBurned: string; // 18-decimal exact base units
  coinsBurnedDisplay: number;
  coinValue: number; // 100
  inrReturned: number; // exact INR returned to reserve
  governmentUserId: string;
  burnTimestamp: number;
  reserveBefore: number;
  reserveAfter: number;
  circulatingBefore: string;
  circulatingAfter: string;
  burnTransactionHash: string;
  encryptedPayload?: EncryptedPayload;
}

export type AuditEventType = "COIN_GENERATION" | "COIN_BURN";

export interface AuditRecord {
  auditId: string; // AUD00001
  generationId: string;
  blockId: string;
  governmentUserId: string;
  studentId: string;
  instituteId: string;
  timestamp: number;
  reserveValue: number;
  coinsGenerated: string; // base units
  coinsGeneratedDisplay: number;
  coinValue: number; // 100
  studentExpiry: number;
  instituteExpiry: number;
  nonce: number;
  hash: string;
  eventType: AuditEventType;
  previousAuditHash: string;
  currentAuditHash: string;
}

export interface ChainState {
  chain: Block[];
  mintingBlocks: MintingBlock[];
  generationRecords: GenerationRecord[];
  burnRecords: BurnRecord[];
  auditLedger: AuditRecord[];
  students: StudentRecord[];
  mempool: Transaction[];
  wallets: Wallet[];
  rejected: Transaction[]; // audit trail of rejected attempts
  difficulty: number;
  miningReward: number;
  createdAt: number;
  reserveINR: number; // INR held in reserve to back circulating EduCoin (the peg)
  demoClockOffsetMs?: number; // Demo clock fast-forward offset in ms
}

export interface Balance {
  address: string;
  name: string;
  role: Role;
  balance: number;
  received: number;
  spent: number;
}

export const ROLE_LABELS: Record<Role, string> = {
  GOVERNMENT: "Government Treasury",
  INSTITUTION: "Educational Institution",
  STUDENT: "Student",
  VENDOR: "Approved Vendor",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  TUITION: "Tuition Fees",
  EXAMINATION: "Examination Fees",
  HOSTEL: "Hostel Fees",
  BOOKS: "Books & Study Material",
  ISSUANCE: "Scholarship Issuance",
  SETTLEMENT: "Redemption / Settlement",
  CLAWBACK: "Expired-fund Clawback",
};

/** Categories a student is permitted to spend on. */
export const APPROVED_CATEGORIES: Category[] = [
  "TUITION",
  "EXAMINATION",
  "HOSTEL",
  "BOOKS",
];

export const SPENDING_CAPS: Record<Category, number> = {
  TUITION: 0,
  EXAMINATION: 10000,
  HOSTEL: 20000,
  BOOKS: 5000,
  ISSUANCE: 0,
  SETTLEMENT: 0,
  CLAWBACK: 0,
};

export const SCHOLARSHIP_TERM_MS = 1000 * 60 * 60 * 24 * 365; // ~1 academic year
export const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 183; // ~6 months
