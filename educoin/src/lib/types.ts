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

export interface ChainState {
  chain: Block[];
  mempool: Transaction[];
  wallets: Wallet[];
  rejected: Transaction[]; // audit trail of rejected attempts
  difficulty: number;
  miningReward: number;
  createdAt: number;
  reserveINR: number; // INR held in reserve to back circulating EduCoin (the peg)
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

/**
 * Per-student cumulative spending caps by category (in EDU), enforced by the
 * smart contract from Stage 3. Prevents disproportionate use of any single
 * category. Tuition is uncapped (0 = no cap) as it is the primary expense.
 */
export const SPENDING_CAPS: Record<Category, number> = {
  TUITION: 0, // no cap — primary educational expense
  EXAMINATION: 10000,
  HOSTEL: 20000,
  BOOKS: 5000,
  ISSUANCE: 0,
  SETTLEMENT: 0,
  CLAWBACK: 0,
};

/** How long a scholarship remains spendable before it can be reclaimed (ms). */
export const SCHOLARSHIP_TERM_MS = 1000 * 60 * 60 * 24 * 365; // ~1 academic year
