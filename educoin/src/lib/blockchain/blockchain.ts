import {
  createGenesisBlock,
  mineBlock,
  computeBlockHash,
  meetsDifficulty,
  computeMerkleRoot,
} from "./block";
import {
  generateKeyPair,
  randomId,
  signMessage,
  verifySignature,
  txSigningPayload,
} from "./crypto";
import { validateTransaction, type ValidationContext } from "./smartContract";
import { isFeatureEnabled } from "@/config/features";
import { CURRENT_STAGE, type Stage } from "@/config/stage";
import {
  SCHOLARSHIP_TERM_MS,
  type Balance,
  type Block,
  type ChainState,
  type Category,
  type Role,
  type Transaction,
  type Wallet,
} from "../types";

export interface SubmitInput {
  type: "MINT" | "TRANSFER";
  from: string | null;
  to: string;
  amount: number;
  category: Category | null;
  memo?: string;
}

export interface SubmitResult {
  transaction: Transaction;
  accepted: boolean;
  reason?: string;
}

export interface ChainIntegrity {
  valid: boolean;
  errors: string[];
  blocksChecked: number;
}

/**
 * The EduCoin blockchain. Wraps a serializable ChainState so it can be
 * persisted to disk between requests.
 */
export const EDU_COIN_VALUE_INR = 100;

export class Blockchain {
  state: ChainState;

  constructor(state: ChainState) {
    this.state = state;
  }

  /** Maximum whole EDU coins that can be issued against the current reserve. */
  maximumReserveBackedCoins(): number {
    return Math.floor(this.state.reserveINR / EDU_COIN_VALUE_INR);
  }

  /** Create a fresh chain with a genesis block. */
  static create(difficulty = 3, miningReward = 0): Blockchain {
    const state: ChainState = {
      chain: [createGenesisBlock()],
      mempool: [],
      wallets: [],
      rejected: [],
      difficulty,
      miningReward,
      createdAt: Date.now(),
      reserveINR: 0,
    };
    return new Blockchain(state);
  }

  // ------------------------------------------------------------- treasury
  get treasury(): Wallet | undefined {
    return this.state.wallets.find((w) => w.role === "GOVERNMENT");
  }

  // ---------------------------------------------------------------- wallets
  get walletMap(): Map<string, Wallet> {
    return new Map(this.state.wallets.map((w) => [w.address, w]));
  }

  getWallet(address: string): Wallet | undefined {
    return this.walletMap.get(address);
  }

  addWallet(name: string, role: Role, institution?: string): Wallet {
    const keys = generateKeyPair();
    const wallet: Wallet = {
      address: keys.address,
      name,
      role,
      institution,
      createdAt: Date.now(),
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
    };
    this.state.wallets.push(wallet);
    return wallet;
  }

  // --------------------------------------------------------------- balances
  /** Confirmed on-chain balance (only counts mined transactions). */
  balanceOf(address: string): number {
    let bal = 0;
    for (const block of this.state.chain) {
      for (const tx of block.transactions) {
        if (tx.status !== "CONFIRMED") continue;
        if (tx.to === address) bal += tx.amount;
        if (tx.from === address) bal -= tx.amount;
      }
    }
    return bal;
  }

  /** Confirmed balance minus funds already committed in the mempool. */
  availableBalance(address: string): number {
    let bal = this.balanceOf(address);
    for (const tx of this.state.mempool) {
      if (tx.from === address) bal -= tx.amount;
    }
    return bal;
  }

  balances(): Balance[] {
    return this.state.wallets.map((w) => {
      let received = 0;
      let spent = 0;
      for (const block of this.state.chain) {
        for (const tx of block.transactions) {
          if (tx.status !== "CONFIRMED") continue;
          if (tx.to === w.address) received += tx.amount;
          if (tx.from === w.address) spent += tx.amount;
        }
      }
      return {
        address: w.address,
        name: w.name,
        role: w.role,
        balance: received - spent,
        received,
        spent,
      };
    });
  }

  // ------------------------------------------------------ stablecoin / peg
  /** Total EduCoin currently in circulation (issued − settled − reclaimed). */
  circulatingSupply(): number {
    let supply = 0;
    for (const tx of this.allTransactions()) {
      if (tx.status !== "CONFIRMED") continue;
      if (tx.type === "MINT") supply += tx.amount;
      if (tx.type === "SETTLE" || tx.type === "CLAWBACK") supply -= tx.amount;
    }
    return supply;
  }

  /** Reserve INR ÷ (circulating EDU × ₹100 per EDU). ≥ 1.0 means fully backed. */
  collateralRatio(): number {
    const circ = this.circulatingSupply();
    const requiredBacking = circ * EDU_COIN_VALUE_INR;
    return circ === 0 ? 1 : this.state.reserveINR / requiredBacking;
  }

  depositReserve(amount: number): void {
    this.state.reserveINR += Math.max(0, amount);
  }

  // ------------------------------------------------------ policy helpers
  /** Cumulative amount a student has spent in a category (confirmed + pending). */
  spentByCategory(address: string, category: Category): number {
    let total = 0;
    const consider = (tx: Transaction) => {
      if (tx.type === "TRANSFER" && tx.from === address && tx.category === category)
        total += tx.amount;
    };
    this.allTransactions().forEach((t) => {
      if (t.status === "CONFIRMED") consider(t);
    });
    this.state.mempool.forEach(consider);
    return total;
  }

  /** The end of a student's scholarship validity term (latest issuance expiry). */
  expiryOf(address: string): number | undefined {
    const mints = this.allTransactions().filter(
      (t) => t.type === "MINT" && t.to === address && t.expiresAt
    );
    if (mints.length === 0) return undefined;
    return Math.max(...mints.map((t) => t.expiresAt!));
  }

  /**
   * Shared context object the smart contract evaluates against. The sector
   * (education) rules are only enforced once Stage 5 unlocks `sectorPolicy`.
   */
  contractContext(stage: Stage = CURRENT_STAGE): ValidationContext {
    return {
      walletByAddress: this.walletMap,
      balanceOf: (a) => this.availableBalance(a),
      spentByCategory: (a, c) => this.spentByCategory(a, c),
      expiryOf: (a) => this.expiryOf(a),
      now: Date.now(),
      sectorPolicy: isFeatureEnabled("sectorPolicy", stage),
    };
  }

  // ---------------------------------------------------------- transactions
  /**
   * Submit a transaction. From Stage 3 onward the smart-contract policy is
   * enforced; before that, transactions are accepted with only basic checks so
   * the earlier milestones can still demonstrate raw ledger mechanics.
   */
  /** Sign a transaction with the signer wallet's private key (Ed25519). */
  private signTx(base: Transaction, signer?: Wallet): void {
    if (!signer?.privateKey) return;
    const payload = txSigningPayload(base);
    base.signature = signMessage(signer.privateKey, payload);
    base.publicKey = signer.publicKey;
  }

  submit(input: SubmitInput, stage: Stage): SubmitResult {
    const now = Date.now();
    const base: Transaction = {
      id: randomId(),
      type: input.type,
      from: input.from,
      to: input.to,
      amount: input.amount,
      category: input.category,
      memo: input.memo,
      timestamp: now,
      status: "PENDING",
    };

    // Issuance is time-bound: scholarship EduCoin carries a validity term.
    if (input.type === "MINT") {
      const recipient = this.getWallet(input.to);
      const studentExpiry = recipient && recipient.role === "STUDENT" && recipient.academicCompletionDate
        ? recipient.academicCompletionDate
        : now + SCHOLARSHIP_TERM_MS;

      base.expiresAt = studentExpiry;
      base.studentId = recipient?.studentId ?? recipient?.name ?? undefined;
      base.academicLevel = recipient?.academicLevel ?? undefined;
      base.academicCompletionDate = recipient?.academicCompletionDate ?? undefined;
      base.instituteExpiryAt = studentExpiry + 1000 * 60 * 60 * 24 * 183;
      base.generationId = `GEN-${Date.now().toString(36).toUpperCase()}`;
    }

    // Cryptographically sign the transaction on the sender's behalf. MINT is
    // signed by the Government Treasury.
    const signer = input.from ? this.getWallet(input.from) : this.treasury;
    this.signTx(base, signer);

    const reject = (reason: string, checks?: Transaction["contractChecks"]) => {
      base.status = "REJECTED";
      base.rejectionReason = reason;
      if (checks) base.contractChecks = checks;
      this.state.rejected.unshift(base);
      return { transaction: base, accepted: false, reason };
    };

    // Reserve-backed minting: the Government can only issue up to the
    // reserve-supported cap, where 1 EDU = ₹100 INR.
    if (input.type === "MINT" && isFeatureEnabled("reserve", stage)) {
      const maxMintable = this.maximumReserveBackedCoins();
      const projected = this.circulatingSupply() + input.amount;
      if (projected > maxMintable) {
        return reject(
          `Reserve cap exceeded: maximum mintable coins are ${maxMintable} EDU from the current reserve of ₹${this.state.reserveINR}. This mint would push circulating supply to ${projected} EDU.`
        );
      }
    }

    const policyOn = isFeatureEnabled("smartContract", stage);

    if (policyOn) {
      const result = validateTransaction(input, this.contractContext(stage));
      // R10 — verify the digital signature binds this tx to a registered wallet.
      const payload = txSigningPayload(base);
      const sigOk =
        !!base.signature &&
        !!base.publicKey &&
        base.publicKey === signer?.publicKey &&
        verifySignature(base.publicKey, payload, base.signature);
      result.checks.push({
        rule: "R10",
        passed: sigOk,
        detail: sigOk
          ? `Valid Ed25519 signature by ${signer?.name}.`
          : "Missing or invalid digital signature.",
      });
      base.contractChecks = result.checks;
      if (!result.ok) return reject(result.reason ?? "Policy violation.", result.checks);
      if (!sigOk) return reject("Invalid digital signature.", result.checks);
    } else {
      // Pre-contract stages: minimal sanity checks only.
      const errors: string[] = [];
      if (input.amount <= 0) errors.push("Amount must be positive.");
      if (!this.getWallet(input.to)) errors.push("Unknown recipient wallet.");
      if (input.type === "TRANSFER") {
        if (!input.from || !this.getWallet(input.from))
          errors.push("Unknown sender wallet.");
        else if (this.availableBalance(input.from) < input.amount)
          errors.push("Insufficient balance.");
      }
      if (errors.length) {
        base.status = "REJECTED";
        base.rejectionReason = errors.join(" ");
        this.state.rejected.unshift(base);
        return { transaction: base, accepted: false, reason: base.rejectionReason };
      }
    }

    this.state.mempool.push(base);
    return { transaction: base, accepted: true };
  }

  // -------------------------------------------------------------- mining
  /** Mine every pending transaction into a new block via proof-of-work. */
  mine(minerName = "EduCoin Validator"): { block: Block; hashes: number; ms: number } | null {
    if (this.state.mempool.length === 0) return null;

    const confirmed = this.state.mempool.map(
      (tx): Transaction => ({ ...tx, status: "CONFIRMED", blockIndex: this.state.chain.length })
    );
    const prev = this.state.chain[this.state.chain.length - 1];
    const base: Omit<Block, "hash" | "nonce" | "merkleRoot"> = {
      index: this.state.chain.length,
      timestamp: Date.now(),
      transactions: confirmed,
      previousHash: prev.hash,
      difficulty: this.state.difficulty,
      minedBy: minerName,
    };
    const result = mineBlock(base, this.state.difficulty);
    this.state.chain.push(result.block);
    this.state.mempool = [];

    // Settlements and clawbacks pay INR out of / return INR to the reserve as
    // EduCoin leaves circulation — keeping the peg exactly collateralised.
    for (const tx of confirmed) {
      if (tx.type === "SETTLE" || tx.type === "CLAWBACK") {
        this.state.reserveINR = Math.max(0, this.state.reserveINR - tx.amount);
      }
    }
    return result;
  }

  // -------------------------------------------------- settlement / clawback
  /**
   * A coin holder redeems EduCoin back to the reserve for real INR (the
   * off-ramp / redemption), burning the coin and releasing reserve fiat. This
   * is the generic stablecoin redemption required by the abstract's Blockchain
   * Ledger Module; any holder (except the issuer itself) may redeem.
   */
  settle(fromAddress: string, amount: number): SubmitResult {
    const wallet = this.getWallet(fromAddress);
    const now = Date.now();
    const base: Transaction = {
      id: randomId(),
      type: "SETTLE",
      from: fromAddress,
      to: this.treasury?.address ?? fromAddress,
      amount,
      category: "SETTLEMENT",
      memo: `${wallet?.name ?? "Holder"} redeemed ${amount} EDU for INR`,
      timestamp: now,
      status: "PENDING",
    };
    const fail = (reason: string) => {
      base.status = "REJECTED";
      base.rejectionReason = reason;
      this.state.rejected.unshift(base);
      return { transaction: base, accepted: false, reason };
    };
    if (!wallet) return fail("Unknown wallet.");
    if (wallet.role === "GOVERNMENT")
      return fail("The issuer holds the reserve and does not redeem coin.");
    if (amount <= 0) return fail("Redemption amount must be positive.");
    if (this.availableBalance(fromAddress) < amount)
      return fail("Redemption exceeds available balance.");

    this.signTx(base, wallet);
    this.state.mempool.push(base);
    return { transaction: base, accepted: true };
  }

  /**
   * The Government reclaims the unspent balance of a student whose scholarship
   * term has expired — preventing lapsed funds from lingering.
   */
  clawback(studentAddress: string): SubmitResult {
    const wallet = this.getWallet(studentAddress);
    const now = Date.now();
    const amount = this.availableBalance(studentAddress);
    const base: Transaction = {
      id: randomId(),
      type: "CLAWBACK",
      from: studentAddress,
      to: this.treasury?.address ?? studentAddress,
      amount,
      category: "CLAWBACK",
      memo: `Reclaimed ${amount} EDU of expired scholarship from ${wallet?.name ?? "student"}`,
      timestamp: now,
      status: "PENDING",
    };
    const fail = (reason: string) => {
      base.status = "REJECTED";
      base.rejectionReason = reason;
      this.state.rejected.unshift(base);
      return { transaction: base, accepted: false, reason };
    };
    if (!wallet || wallet.role !== "STUDENT")
      return fail("Clawback applies only to student wallets.");
    const expiry = this.expiryOf(studentAddress);
    if (!expiry || now <= expiry)
      return fail("This scholarship has not expired yet.");
    if (amount <= 0) return fail("No remaining balance to reclaim.");

    this.signTx(base, this.treasury); // authorised by the Government
    this.state.mempool.push(base);
    return { transaction: base, accepted: true };
  }

  // ---------------------------------------------------------- integrity
  /** Re-hash and re-link every block to detect any tampering. */
  validateChain(): ChainIntegrity {
    const errors: string[] = [];
    for (let i = 0; i < this.state.chain.length; i++) {
      const block = this.state.chain[i];
      // Re-derive the Merkle root from the transactions: this is what makes tx
      // tampering detectable — the header commits to it via the block hash.
      const recomputedRoot = computeMerkleRoot(block.transactions);
      if (recomputedRoot !== block.merkleRoot) {
        errors.push(`Block #${i} Merkle root mismatch — a transaction was altered.`);
      }
      const recomputed = computeBlockHash(block);
      if (recomputed !== block.hash) {
        errors.push(`Block #${i} hash mismatch — contents were altered.`);
      }
      if (!meetsDifficulty(block.hash, block.difficulty)) {
        errors.push(`Block #${i} does not satisfy its proof-of-work target.`);
      }
      if (i > 0) {
        const prev = this.state.chain[i - 1];
        if (block.previousHash !== prev.hash) {
          errors.push(`Block #${i} is not linked to block #${i - 1}.`);
        }
      }
    }
    return { valid: errors.length === 0, errors, blocksChecked: this.state.chain.length };
  }

  // ------------------------------------------------------ queries / trace
  allTransactions(): Transaction[] {
    const out: Transaction[] = [];
    for (const block of this.state.chain) out.push(...block.transactions);
    return out;
  }

  transactionsFor(address: string): Transaction[] {
    return this.allTransactions().filter(
      (tx) => tx.from === address || tx.to === address
    );
  }

  /**
   * Trace the flow of scholarship funds for a student: the issuance that funded
   * them and every downstream educational spend. Powers the Stage-4 tracing UI.
   */
  traceStudent(address: string): {
    issued: Transaction[];
    spent: Transaction[];
    totalIssued: number;
    totalSpent: number;
  } {
    const txs = this.allTransactions().filter((t) => t.status === "CONFIRMED");
    const issued = txs.filter((t) => t.type === "MINT" && t.to === address);
    const spent = txs.filter((t) => t.type === "TRANSFER" && t.from === address);
    return {
      issued,
      spent,
      totalIssued: issued.reduce((s, t) => s + t.amount, 0),
      totalSpent: spent.reduce((s, t) => s + t.amount, 0),
    };
  }
}
