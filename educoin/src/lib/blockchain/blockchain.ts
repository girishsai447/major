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
  sha256,
} from "./crypto";
import { solvePuzzle, buildPuzzleString } from "./puzzle";
import {
  encryptRecordPayload,
  decryptRecordPayload,
  computeAuditHash,
  verifyAuditChain,
  GENESIS_AUDIT_HASH,
  type AuditVerificationResult,
} from "./auditLedger";
import {
  parseCoinsToBaseUnits,
  formatBaseUnitsToExact,
  formatBaseUnitsToDisplay,
  baseUnitsToInr,
  maxMintableCoins,
  BASE_UNIT,
  COIN_VALUE_INR,
} from "../decimal";
import { validateTransaction, type ValidationContext } from "./smartContract";
import { isFeatureEnabled } from "@/config/features";
import { CURRENT_STAGE, type Stage } from "@/config/stage";
import {
  mintSerializedCoinBatch,
  verifyCoinUnits,
  computeCoinId,
  formatDisplaySerial,
  computeBatchMerkleRoot,
} from "./coinRegistry";
import {
  SCHOLARSHIP_TERM_MS,
  SIX_MONTHS_MS,
  type Balance,
  type Block,
  type ChainState,
  type Category,
  type Role,
  type Transaction,
  type Wallet,
  type StudentRecord,
  type MintingBlock,
  type GenerationRecord,
  type BurnRecord,
  type AuditRecord,
  type GenerationStatus,
  type EduCoinUnit,
  type CoinBatch,
  type CoinBatchVerificationResult,
  type CoinProvenanceEntry,
} from "../types";

export interface SubmitInput {
  type: "MINT" | "TRANSFER";
  from: string | null;
  to: string;
  amount: number;
  category: Category | null;
  memo?: string;
  coinIds?: string[];
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

export const EDU_COIN_VALUE_INR = 100;

export class Blockchain {
  state: ChainState;

  constructor(state: ChainState) {
    this.state = state;
    // Ensure all new structures are initialized if loading an older state
    if (!this.state.mintingBlocks) this.state.mintingBlocks = [];
    if (!this.state.generationRecords) this.state.generationRecords = [];
    if (!this.state.burnRecords) this.state.burnRecords = [];
    if (!this.state.auditLedger) this.state.auditLedger = [];
    if (!this.state.coins) this.state.coins = [];
    if (!this.state.coinBatches) this.state.coinBatches = [];
    if (!this.state.students) this.state.students = [];
    if (this.state.demoClockOffsetMs === undefined) this.state.demoClockOffsetMs = 0;
  }

  /** Current effective time (supports demo clock fast-forwarding). */
  getEffectiveTime(): number {
    return Date.now() + (this.state.demoClockOffsetMs || 0);
  }

  setDemoClockOffset(offsetMs: number): void {
    this.state.demoClockOffsetMs = offsetMs;
  }

  /** Maximum whole EDU coins that can be issued against the current reserve. */
  maximumReserveBackedCoins(): number {
    return Math.floor(Math.max(0, this.state.reserveINR) / EDU_COIN_VALUE_INR);
  }

  /** Create a fresh chain with genesis block and empty collections. */
  static create(difficulty = 3, miningReward = 0): Blockchain {
    const state: ChainState = {
      chain: [createGenesisBlock()],
      mintingBlocks: [],
      generationRecords: [],
      burnRecords: [],
      auditLedger: [],
      students: [],
      mempool: [],
      wallets: [],
      rejected: [],
      coins: [],
      coinBatches: [],
      difficulty,
      miningReward,
      createdAt: Date.now(),
      reserveINR: 0,
      demoClockOffsetMs: 0,
    };
    return new Blockchain(state);
  }

  // ------------------------------------------------------------- coin registry
  get coinMap(): Map<string, EduCoinUnit> {
    return new Map((this.state.coins ?? []).map((c) => [c.coinId, c]));
  }

  getCoins(): EduCoinUnit[] {
    return this.state.coins ?? [];
  }

  getCoin(coinId: string): EduCoinUnit | undefined {
    return this.coinMap.get(coinId);
  }

  getCoinsByOwner(ownerAddress: string): EduCoinUnit[] {
    const target = ownerAddress.toLowerCase();
    return (this.state.coins ?? []).filter((c) => c.currentOwner.toLowerCase() === target);
  }

  getBatches(): CoinBatch[] {
    return this.state.coinBatches ?? [];
  }

  mintSerializedBatch(input: {
    totalCoins: number;
    allocatedStudentId?: string;
    allocatedStudentName?: string;
    allocatedRecipient?: string;
    initialOwner?: string;
    initialOwnerName?: string;
  }): { batch: CoinBatch; coins: EduCoinUnit[] } {
    const treasury = this.treasury;
    if (!treasury) throw new Error("Government Treasury wallet not found");

    const batchNumber = (this.state.coinBatches?.length ?? 0) + 1;
    const now = this.getEffectiveTime();

    const { batch, coins } = mintSerializedCoinBatch({
      batchNumber,
      totalCoins: input.totalCoins,
      treasuryWallet: treasury,
      timestamp: now,
      allocatedStudentId: input.allocatedStudentId,
      allocatedStudentName: input.allocatedStudentName,
      allocatedRecipient: input.allocatedRecipient,
      initialOwner: input.initialOwner ?? treasury.address,
      initialOwnerName: input.initialOwnerName ?? treasury.name,
    });

    if (!this.state.coinBatches) this.state.coinBatches = [];
    if (!this.state.coins) this.state.coins = [];

    this.state.coinBatches.push(batch);
    this.state.coins.push(...coins);

    return { batch, coins };
  }

  verifyCoinBatch(coinIds: string[], expectedOwner?: string): CoinBatchVerificationResult {
    const coinMap = this.coinMap;
    const coinsToVerify: EduCoinUnit[] = [];

    for (const id of coinIds) {
      const found = coinMap.get(id);
      if (found) {
        coinsToVerify.push(found);
      } else {
        coinsToVerify.push({
          coinId: id,
          displaySerial: "UNKNOWN-OR-COUNTERFEIT",
          batchId: "INVALID",
          serialNumber: 0,
          denomination: EDU_COIN_VALUE_INR,
          issuer: "UNKNOWN",
          mintedAt: 0,
          currentOwner: "UNKNOWN",
          status: "ACTIVE",
          mintSignature: "",
          history: [],
        });
      }
    }

    return verifyCoinUnits({
      coins: coinsToVerify,
      allRegisteredCoins: coinMap,
      treasuryWallet: this.treasury,
      expectedOwner,
    });
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

  // --------------------------------------------------------------- students
  get studentMap(): Map<string, StudentRecord> {
    return new Map(this.state.students.map((s) => [s.studentId, s]));
  }

  getStudent(studentId: string): StudentRecord | undefined {
    return this.studentMap.get(studentId);
  }

  addStudent(student: StudentRecord): void {
    const existingIdx = this.state.students.findIndex((s) => s.studentId === student.studentId);
    if (existingIdx >= 0) {
      this.state.students[existingIdx] = student;
    } else {
      this.state.students.push(student);
    }
  }

  // -------------------------------------------------- 18-decimal supply & reserve
  /** Total coins generated across all generation records (in 18-decimal base units). */
  totalGeneratedBaseUnits(): bigint {
    let total = 0n;
    for (const record of this.state.generationRecords) {
      try {
        total += BigInt(record.coinsGenerated || "0");
      } catch {
        // fallback
      }
    }
    return total;
  }

  /** Total coins burned across all burn records (in 18-decimal base units). */
  totalBurnedBaseUnits(): bigint {
    let total = 0n;
    for (const record of this.state.burnRecords) {
      try {
        total += BigInt(record.coinsBurned || "0");
      } catch {
        // fallback
      }
    }
    return total;
  }

  /** Total circulating coins in base units (Generated − Burned). */
  circulatingBaseUnits(): bigint {
    const gen = this.totalGeneratedBaseUnits();
    const brn = this.totalBurnedBaseUnits();
    return gen >= brn ? gen - brn : 0n;
  }

  /** Human-readable circulating coins display number. */
  circulatingCoinsDisplay(): number {
    return formatBaseUnitsToDisplay(this.circulatingBaseUnits());
  }

  /** Remaining minting capacity according to supervisor formula. */
  remainingMintingCapacity(): {
    wholeCoins: number;
    baseUnits: string;
    reserveINR: number;
    circulatingCoinsDisplay: number;
  } {
    const circulating = this.circulatingBaseUnits();
    // Circulating value in INR
    const circulatingInr = baseUnitsToInr(circulating).inrWhole;
    const remainingInr = Math.max(0, this.state.reserveINR - circulatingInr);
    const wholeCoins = Math.floor(remainingInr / EDU_COIN_VALUE_INR);
    const maxBase = maxMintableCoins(this.state.reserveINR);
    const remBase = maxBase >= circulating ? maxBase - circulating : 0n;

    return {
      wholeCoins,
      baseUnits: remBase.toString(),
      reserveINR: this.state.reserveINR,
      circulatingCoinsDisplay: this.circulatingCoinsDisplay(),
    };
  }

  depositReserve(amount: number): void {
    this.state.reserveINR += Math.max(0, amount);
  }

  // -------------------------------------------------- Core Coin Generation (Puzzle + Nonce)
  /**
   * Supervisor Specification:
   * 1. Government selects student
   * 2. Reserve verification: Existing Minted + New <= floor(Reserve / 100)
   * 3. Student Expiry = Student Academic Completion Date
   * 4. Institute Expiry = Student Expiry + 6 months
   * 5. Modular puzzle generation & nonce solving
   * 6. Minting block creation
   * 7. Allocation record (GEN00001) with Status: GENERATED, Wallet Status: NOT LINKED
   * 8. AES-256-GCM encryption of payload
   * 9. Hash-chained audit ledger entry
   */
  generateCoins(input: {
    studentId: string;
    amountCoins: number;
    governmentAuthorityId?: string;
  }): {
    success: boolean;
    error?: string;
    generationRecord?: GenerationRecord;
    mintingBlock?: MintingBlock;
    auditRecord?: AuditRecord;
  } {
    const { studentId, amountCoins, governmentAuthorityId = "GOV-TREASURY-01" } = input;

    if (!studentId) {
      return { success: false, error: "Student selection is required." };
    }
    if (!amountCoins || amountCoins <= 0) {
      return { success: false, error: "Number of coins must be greater than zero." };
    }

    const student = this.getStudent(studentId);
    if (!student) {
      return { success: false, error: `Student with ID ${studentId} not found in government records.` };
    }

    // 18-decimal base unit check against reserve
    const newCoinsBaseUnits = parseCoinsToBaseUnits(amountCoins);
    const currentCirculating = this.circulatingBaseUnits();
    const projectedCirculating = currentCirculating + newCoinsBaseUnits;
    const maxCoinsBaseUnits = maxMintableCoins(this.state.reserveINR);

    if (projectedCirculating > maxCoinsBaseUnits) {
      const maxWhole = this.maximumReserveBackedCoins();
      const currentWhole = formatBaseUnitsToDisplay(currentCirculating);
      return {
        success: false,
        error: `Reserve backing exceeded: Current reserve ₹${this.state.reserveINR.toLocaleString()} backs a maximum of ${maxWhole} EDU Coins. Currently circulating: ${currentWhole} EDU. Minting ${amountCoins} EDU would exceed reserve capacity.`,
      };
    }

    const now = this.getEffectiveTime();
    const studentExpiry = student.academicCompletionDate;
    const instituteExpiry = studentExpiry + SIX_MONTHS_MS;
    const coinValue = EDU_COIN_VALUE_INR;
    const totalValueInr = amountCoins * coinValue;

    // Sequential ID generation
    const genIndex = this.state.generationRecords.length + 1;
    const generationId = `GEN${String(genIndex).padStart(5, "0")}`;

    const blockIndex = this.state.mintingBlocks.length + 1;
    const blockId = `MBLK-${String(blockIndex).padStart(5, "0")}`;

    const prevBlock = this.state.mintingBlocks[this.state.mintingBlocks.length - 1];
    const previousBlockHash = prevBlock ? prevBlock.hash : this.state.chain[0]?.hash || "0".repeat(64);

    // Solve Puzzle with Nonce mechanism
    const puzzleParams = {
      generationTimestamp: now,
      studentId: student.studentId,
      studentAcademicCompletionDate: student.academicCompletionDate,
      studentCoinExpiry: studentExpiry,
      instituteId: student.instituteId,
      instituteExpiry,
      reserveValue: this.state.reserveINR,
      coinValue,
      numberOfCoinsGenerated: newCoinsBaseUnits.toString(),
      governmentAuthorityId,
    };

    // Use moderate difficulty (e.g. 2 or 3) for snappy responsive UX
    const solution = solvePuzzle(puzzleParams, Math.min(3, Math.max(2, this.state.difficulty)));

    // Create Minting Block
    const mintingBlock: MintingBlock = {
      blockId,
      previousBlockHash,
      generationTimestamp: now,
      studentId: student.studentId,
      instituteId: student.instituteId,
      studentAcademicCompletionDate: student.academicCompletionDate,
      studentCoinExpiry: studentExpiry,
      instituteExpiry,
      reserveValue: this.state.reserveINR,
      coinValue,
      numberOfCoinsGenerated: newCoinsBaseUnits.toString(),
      numberOfCoinsDisplay: amountCoins,
      nonce: solution.nonce,
      hash: solution.hash,
      governmentAuthorityId,
      puzzleInput: solution.puzzleInput,
    };

    // Encrypt sensitive transaction payload using AES-256-GCM
    const sensitivePayload = {
      generationId,
      blockId,
      studentId: student.studentId,
      studentName: student.name,
      instituteId: student.instituteId,
      instituteName: student.instituteName,
      academicLevel: student.academicLevel,
      coinsGenerated: amountCoins,
      reserveAtMint: this.state.reserveINR,
      timestamp: now,
      hash: solution.hash,
    };
    const encrypted = encryptRecordPayload(sensitivePayload);

    // Generate individual serialized EduCoin units with unique cryptographic addresses
    const mintedCoins: EduCoinUnit[] = [];
    const treasuryAddress = this.treasury?.address ?? "0x0000000000000000000000000000000000000000";
    const studentOwner = student.walletAddress || student.studentId;

    for (let i = 1; i <= amountCoins; i++) {
      const coinId = computeCoinId(treasuryAddress, generationId, i, coinValue, now);
      const displaySerial = `EDU-${generationId}-${String(i).padStart(4, "0")}`;
      const mintEntry: CoinProvenanceEntry = {
        txId: `GEN-${generationId}-${i}`,
        from: null,
        to: studentOwner,
        fromName: "Government Treasury Reserve",
        toName: student.name,
        timestamp: now,
        category: "ISSUANCE",
        memo: `Minted via Nonce ${solution.nonce} & Dispatched to ${student.instituteName} for ${student.name}`,
        action: "MINT",
      };

      const coinSignPayload = `COIN_CERT|${coinId}|${generationId}|${i}|${coinValue}|${now}`;
      const mintSignature = this.treasury?.privateKey
        ? signMessage(this.treasury.privateKey, coinSignPayload)
        : sha256(coinSignPayload);

      mintedCoins.push({
        coinId,
        displaySerial,
        batchId: generationId,
        serialNumber: i,
        denomination: coinValue,
        issuer: treasuryAddress,
        mintedAt: now,
        currentOwner: studentOwner,
        currentOwnerName: student.name,
        status: "ACTIVE",
        mintSignature,
        history: [mintEntry],
        studentId: student.studentId,
        studentName: student.name,
        instituteId: student.instituteId,
        instituteName: student.instituteName,
        generationId,
        institutionalStatus: "PRE_AUTHORIZED",
      });
    }

    if (!this.state.coins) this.state.coins = [];
    this.state.coins.push(...mintedCoins);

    // Create Batch record for Merkle verification
    const coinIdsList = mintedCoins.map((c) => c.coinId);
    const batchRoot = computeBatchMerkleRoot(coinIdsList);
    const coinBatchRecord: CoinBatch = {
      batchId: generationId,
      batchNumber: this.state.generationRecords.length + 1,
      totalCoins: amountCoins,
      denomination: coinValue,
      totalValueINR: totalValueInr,
      startSerial: 1,
      endSerial: amountCoins,
      merkleRoot: batchRoot,
      issuerAddress: treasuryAddress,
      issuerSignature: solution.hash,
      timestamp: now,
      allocatedStudentId: student.studentId,
      allocatedStudentName: student.name,
      allocatedRecipient: `${student.name} (${student.instituteName})`,
    };
    if (!this.state.coinBatches) this.state.coinBatches = [];
    this.state.coinBatches.push(coinBatchRecord);

    // Create Generation / Allocation Record (NO wallet transfer)
    const generationRecord: GenerationRecord = {
      generationId,
      blockId,
      studentId: student.studentId,
      studentName: student.name,
      instituteId: student.instituteId,
      instituteName: student.instituteName,
      academicLevel: student.academicLevel,
      coinsGenerated: newCoinsBaseUnits.toString(),
      coinsRemaining: newCoinsBaseUnits.toString(),
      coinsBurned: "0",
      coinsDisplay: amountCoins,
      coinValue,
      totalValue: totalValueInr,
      studentExpiry,
      instituteExpiry,
      status: "GENERATED",
      walletStatus: "NOT LINKED",
      walletAddress: null,
      generationTimestamp: now,
      nonce: solution.nonce,
      hash: solution.hash,
      governmentAuthorityId,
      encryptedPayload: encrypted,
      coinIds: coinIdsList,
    };

    // Create Audit Record (Chained to previous audit record)
    const auditIndex = this.state.auditLedger.length + 1;
    const auditId = `AUD${String(auditIndex).padStart(5, "0")}`;
    const prevAudit = this.state.auditLedger[this.state.auditLedger.length - 1];
    const previousAuditHash = prevAudit ? prevAudit.currentAuditHash : GENESIS_AUDIT_HASH;

    const auditDraft: Omit<AuditRecord, "currentAuditHash"> = {
      auditId,
      generationId,
      blockId,
      governmentUserId: governmentAuthorityId,
      studentId: student.studentId,
      instituteId: student.instituteId,
      timestamp: now,
      reserveValue: this.state.reserveINR,
      coinsGenerated: newCoinsBaseUnits.toString(),
      coinsGeneratedDisplay: amountCoins,
      coinValue,
      studentExpiry,
      instituteExpiry,
      nonce: solution.nonce,
      hash: solution.hash,
      eventType: "COIN_GENERATION",
      previousAuditHash,
    };
    const currentAuditHash = computeAuditHash(auditDraft);
    const auditRecord: AuditRecord = {
      ...auditDraft,
      currentAuditHash,
    };

    // Commit all state atomically
    this.state.mintingBlocks.push(mintingBlock);
    this.state.generationRecords.push(generationRecord);
    this.state.auditLedger.push(auditRecord);

    return {
      success: true,
      generationRecord,
      mintingBlock,
      auditRecord,
    };
  }

  // -------------------------------------------------- Expiry Burn & INR Return
  /**
   * Scan for expired generation records according to effective time.
   */
  getExpiredGenerations(effectiveTime = this.getEffectiveTime()): {
    studentExpired: GenerationRecord[];
    instituteExpired: GenerationRecord[];
    eligibleForBurn: GenerationRecord[];
  } {
    const studentExpired: GenerationRecord[] = [];
    const instituteExpired: GenerationRecord[] = [];
    const eligibleForBurn: GenerationRecord[] = [];

    for (const record of this.state.generationRecords) {
      if (record.status === "BURNED") continue;
      const remBase = BigInt(record.coinsRemaining || "0");
      if (remBase <= 0n) continue;

      if (effectiveTime > record.instituteExpiry) {
        instituteExpired.push(record);
        eligibleForBurn.push(record);
      } else if (effectiveTime > record.studentExpiry) {
        studentExpired.push(record);
        eligibleForBurn.push(record);
      }
    }

    return { studentExpired, instituteExpired, eligibleForBurn };
  }

  /**
   * Burn expired coins and return INR to reserve atomically:
   * INR Value = Expired Coins x 100
   * 18-decimal base units
   */
  burnExpiredCoins(input: {
    generationId: string;
    governmentUserId?: string;
  }): {
    success: boolean;
    error?: string;
    burnRecord?: BurnRecord;
    auditRecord?: AuditRecord;
  } {
    const { generationId, governmentUserId = "GOV-TREASURY-01" } = input;
    const record = this.state.generationRecords.find((r) => r.generationId === generationId);

    if (!record) {
      return { success: false, error: `Generation record ${generationId} not found.` };
    }
    if (record.status === "BURNED") {
      return { success: false, error: `Generation record ${generationId} has already been burned.` };
    }

    const now = this.getEffectiveTime();
    let expiryType: "STUDENT" | "INSTITUTE" = "STUDENT";
    let expiryDate = record.studentExpiry;

    if (now > record.instituteExpiry) {
      expiryType = "INSTITUTE";
      expiryDate = record.instituteExpiry;
    } else if (now > record.studentExpiry) {
      expiryType = "STUDENT";
      expiryDate = record.studentExpiry;
    } else {
      const studentDateStr = new Date(record.studentExpiry).toLocaleDateString();
      return {
        success: false,
        error: `Cannot burn record ${generationId}: Student expiry is ${studentDateStr} and has not yet passed. Fast-forward the demo clock to test this!`,
      };
    }

    const remBase = BigInt(record.coinsRemaining || "0");
    if (remBase <= 0n) {
      return { success: false, error: `No unspent balance remains on record ${generationId} to burn.` };
    }

    // 18-decimal exact calculation of INR to return
    const inrCalculation = baseUnitsToInr(remBase);
    const inrReturned = inrCalculation.inrWhole;
    const coinsBurnedDisplay = formatBaseUnitsToDisplay(remBase);

    // Track supply & reserve state before/after
    const reserveBefore = this.state.reserveINR;
    const circulatingBefore = this.circulatingBaseUnits().toString();

    // Atomic update: Credit reserve, mark burned
    this.state.reserveINR += inrReturned;
    const reserveAfter = this.state.reserveINR;
    const circulatingAfter = (this.circulatingBaseUnits() - remBase).toString();

    record.coinsBurned = remBase.toString();
    record.coinsRemaining = "0";
    record.status = "BURNED";
    record.burnTimestamp = now;
    record.inrReturned = inrReturned;

    // Create Burn Record (BRN00001)
    const burnIndex = this.state.burnRecords.length + 1;
    const burnId = `BRN${String(burnIndex).padStart(5, "0")}`;
    const burnTxHash = sha256(`BURN|${burnId}|${generationId}|${now}|${remBase.toString()}|${inrReturned}`);

    const burnPayload = {
      burnId,
      generationId,
      studentId: record.studentId,
      studentName: record.studentName,
      coinsBurned: coinsBurnedDisplay,
      inrReturned,
      burnTimestamp: now,
      hash: burnTxHash,
    };
    const encrypted = encryptRecordPayload(burnPayload);

    const burnRecord: BurnRecord = {
      burnId,
      generationId,
      studentId: record.studentId,
      studentName: record.studentName,
      instituteId: record.instituteId,
      expiryType,
      expiryDate,
      coinsBurned: remBase.toString(),
      coinsBurnedDisplay,
      coinValue: EDU_COIN_VALUE_INR,
      inrReturned,
      governmentUserId,
      burnTimestamp: now,
      reserveBefore,
      reserveAfter,
      circulatingBefore,
      circulatingAfter,
      burnTransactionHash: burnTxHash,
      encryptedPayload: encrypted,
    };

    // Append to Audit Ledger (COIN_BURN)
    const auditIndex = this.state.auditLedger.length + 1;
    const auditId = `AUD${String(auditIndex).padStart(5, "0")}`;
    const prevAudit = this.state.auditLedger[this.state.auditLedger.length - 1];
    const previousAuditHash = prevAudit ? prevAudit.currentAuditHash : GENESIS_AUDIT_HASH;

    const auditDraft: Omit<AuditRecord, "currentAuditHash"> = {
      auditId,
      generationId,
      blockId: record.blockId,
      governmentUserId,
      studentId: record.studentId,
      instituteId: record.instituteId,
      timestamp: now,
      reserveValue: reserveAfter,
      coinsGenerated: remBase.toString(),
      coinsGeneratedDisplay: coinsBurnedDisplay,
      coinValue: EDU_COIN_VALUE_INR,
      studentExpiry: record.studentExpiry,
      instituteExpiry: record.instituteExpiry,
      nonce: record.nonce,
      hash: burnTxHash,
      eventType: "COIN_BURN",
      previousAuditHash,
    };
    const currentAuditHash = computeAuditHash(auditDraft);
    const auditRecord: AuditRecord = {
      ...auditDraft,
      currentAuditHash,
    };

    this.state.burnRecords.push(burnRecord);
    this.state.auditLedger.push(auditRecord);

    return {
      success: true,
      burnRecord,
      auditRecord,
    };
  }

  // -------------------------------------------------- Audit Ledger Verification
  verifyAuditLedger(): AuditVerificationResult {
    return verifyAuditChain(this.state.auditLedger);
  }

  // -------------------------------------------------- Balances & Backward Compatibility
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

  circulatingSupply(): number {
    // Return display circulating count combining block txs & generation records
    const genCirc = this.circulatingCoinsDisplay();
    let txSupply = 0;
    for (const tx of this.allTransactions()) {
      if (tx.status !== "CONFIRMED") continue;
      if (tx.type === "MINT") txSupply += tx.amount;
      if (tx.type === "SETTLE" || tx.type === "CLAWBACK") txSupply -= tx.amount;
    }
    return Math.max(genCirc, txSupply);
  }

  collateralRatio(): number {
    const circ = this.circulatingSupply();
    const requiredBacking = circ * EDU_COIN_VALUE_INR;
    return circ === 0 ? 1 : this.state.reserveINR / requiredBacking;
  }

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

  expiryOf(address: string): number | undefined {
    const mints = this.allTransactions().filter(
      (t) => t.type === "MINT" && t.to === address && t.expiresAt
    );
    if (mints.length === 0) return undefined;
    return Math.max(...mints.map((t) => t.expiresAt!));
  }

  contractContext(stage: Stage = CURRENT_STAGE): ValidationContext {
    return {
      walletByAddress: this.walletMap,
      balanceOf: (a) => this.availableBalance(a),
      spentByCategory: (a, c) => this.spentByCategory(a, c),
      expiryOf: (a) => this.expiryOf(a),
      now: this.getEffectiveTime(),
      sectorPolicy: isFeatureEnabled("sectorPolicy", stage),
      coinMap: this.coinMap,
    };
  }

  private signTx(base: Transaction, signer?: Wallet): void {
    if (!signer?.privateKey) return;
    const payload = txSigningPayload(base);
    base.signature = signMessage(signer.privateKey, payload);
    base.publicKey = signer.publicKey;
  }

  submit(input: SubmitInput, stage: Stage): SubmitResult {
    const now = this.getEffectiveTime();
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
      coinIds: input.coinIds,
    };

    // If coin IDs were not explicitly specified on transfer, auto-select active coins from sender
    if (input.type === "TRANSFER" && (!base.coinIds || base.coinIds.length === 0) && input.from) {
      const availableCoins = this.getCoinsByOwner(input.from).filter((c) => c.status === "ACTIVE");
      if (availableCoins.length >= input.amount) {
        base.coinIds = availableCoins.slice(0, input.amount).map((c) => c.coinId);
      }
    }

    if (input.type === "MINT") {
      const recipient = this.getWallet(input.to);
      const studentExpiry = recipient && recipient.role === "STUDENT" && recipient.academicCompletionDate
        ? recipient.academicCompletionDate
        : now + SCHOLARSHIP_TERM_MS;

      base.expiresAt = studentExpiry;
      base.studentId = recipient?.studentId ?? recipient?.name ?? undefined;
      base.academicLevel = recipient?.academicLevel ?? undefined;
      base.academicCompletionDate = recipient?.academicCompletionDate ?? undefined;
      base.instituteExpiryAt = studentExpiry + SIX_MONTHS_MS;
      base.generationId = `GEN-${Date.now().toString(36).toUpperCase()}`;
    }

    const signer = input.from ? this.getWallet(input.from) : this.treasury;
    this.signTx(base, signer);

    const reject = (reason: string, checks?: Transaction["contractChecks"]) => {
      base.status = "REJECTED";
      base.rejectionReason = reason;
      if (checks) base.contractChecks = checks;
      this.state.rejected.unshift(base);
      return { transaction: base, accepted: false, reason };
    };

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
      const result = validateTransaction(
        {
          type: base.type,
          from: base.from,
          to: base.to,
          amount: base.amount,
          category: base.category,
          coinIds: base.coinIds,
        },
        this.contractContext(stage)
      );
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

  mine(minerName = "EduCoin Validator"): { block: Block; hashes: number; ms: number } | null {
    if (this.state.mempool.length === 0) return null;

    const confirmed = this.state.mempool.map(
      (tx): Transaction => ({ ...tx, status: "CONFIRMED", blockIndex: this.state.chain.length })
    );
    const prev = this.state.chain[this.state.chain.length - 1];
    const base: Omit<Block, "hash" | "nonce" | "merkleRoot"> = {
      index: this.state.chain.length,
      timestamp: this.getEffectiveTime(),
      transactions: confirmed,
      previousHash: prev.hash,
      difficulty: this.state.difficulty,
      minedBy: minerName,
    };
    const result = mineBlock(base, this.state.difficulty);
    this.state.chain.push(result.block);
    this.state.mempool = [];

    for (const tx of confirmed) {
      if (tx.type === "SETTLE" || tx.type === "CLAWBACK") {
        this.state.reserveINR = Math.max(0, this.state.reserveINR - tx.amount);
      }

      // Update individual coin ownership and provenance ledger
      if (tx.coinIds && tx.coinIds.length > 0) {
        const toWallet = this.getWallet(tx.to);
        const fromWallet = tx.from ? this.getWallet(tx.from) : undefined;
        for (const cid of tx.coinIds) {
          const coin = this.getCoin(cid);
          if (!coin) continue;

          if (tx.type === "TRANSFER") {
            coin.currentOwner = tx.to;
            coin.currentOwnerName = toWallet?.name ?? tx.to;
            if (toWallet?.role === "INSTITUTION") {
              coin.institutionalStatus = "COLLECTED_AS_FEE";
            }
            coin.history.push({
              txId: tx.id,
              from: tx.from,
              to: tx.to,
              fromName: fromWallet?.name ?? tx.from ?? "Unknown",
              toName: toWallet?.name ?? tx.to,
              timestamp: tx.timestamp,
              category: tx.category,
              memo: tx.memo,
              action: "TRANSFER",
              signature: tx.signature,
              blockIndex: result.block.index,
            });
          } else if (tx.type === "SETTLE") {
            coin.status = "REDEEMED";
            coin.institutionalStatus = "REDEEMED_AT_BANK";
            coin.currentOwner = this.treasury?.address ?? tx.to;
            coin.currentOwnerName = this.treasury?.name ?? "Government Treasury";
            coin.history.push({
              txId: tx.id,
              from: tx.from,
              to: this.treasury?.address ?? tx.to,
              fromName: fromWallet?.name ?? tx.from ?? "Unknown",
              toName: this.treasury?.name ?? "Government Treasury",
              timestamp: tx.timestamp,
              category: "SETTLEMENT",
              memo: tx.memo,
              action: "SETTLE",
              signature: tx.signature,
              blockIndex: result.block.index,
            });
          }
        }
      }
    }
    return result;
  }

  settle(fromAddress: string, amount: number, coinIds?: string[]): SubmitResult {
    const wallet = this.getWallet(fromAddress);
    const now = this.getEffectiveTime();

    // Auto-select active coins if not explicitly provided
    let resolvedCoinIds = coinIds;
    if (!resolvedCoinIds || resolvedCoinIds.length === 0) {
      const activeCoins = this.getCoinsByOwner(fromAddress).filter((c) => c.status === "ACTIVE");
      if (activeCoins.length >= amount) {
        resolvedCoinIds = activeCoins.slice(0, amount).map((c) => c.coinId);
      }
    }

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
      coinIds: resolvedCoinIds,
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

  clawback(studentAddress: string): SubmitResult {
    const wallet = this.getWallet(studentAddress);
    const now = this.getEffectiveTime();
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

    this.signTx(base, this.treasury);
    this.state.mempool.push(base);
    return { transaction: base, accepted: true };
  }

  validateChain(): ChainIntegrity {
    const errors: string[] = [];
    for (let i = 0; i < this.state.chain.length; i++) {
      const block = this.state.chain[i];
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
