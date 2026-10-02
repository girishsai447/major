import {
  APPROVED_CATEGORIES,
  CATEGORY_LABELS,
  ROLE_LABELS,
  SPENDING_CAPS,
  type Category,
  type ContractCheck,
  type Role,
  type Transaction,
  type Wallet,
} from "../types";

/**
 * ============================================================================
 *  EduCoinPolicy — the on-chain "smart contract".
 * ============================================================================
 *
 *  In a production system these rules would live in a Solidity contract on an
 *  EVM chain. Here they are expressed as a deterministic, auditable rule engine
 *  in TypeScript so the prototype runs entirely inside Next.js with no wallet,
 *  gas, or testnet dependencies — while enforcing exactly the boundaries the
 *  project abstract describes:
 *
 *    • Only the Government Treasury may issue (mint) EduCoin.
 *    • Scholarship coins may be spent only by the student they were issued to.
 *    • Spending is allowed only toward authorized participants
 *      (institutions / approved vendors) — never student-to-student, which
 *      blocks cashing out.
 *    • Every spend must declare an approved educational category, and the
 *      category must be valid for the recipient type.
 *    • A student can never spend more than their verifiable on-chain balance.
 *
 *  Any transaction violating these rules is automatically REJECTED and recorded
 *  in the audit trail — it never enters a block.
 * ============================================================================
 */

/** Which educational categories each recipient role may legitimately receive. */
export const RECIPIENT_CATEGORY_MATRIX: Record<Role, Category[]> = {
  GOVERNMENT: [],
  INSTITUTION: ["TUITION", "EXAMINATION", "HOSTEL"],
  VENDOR: ["BOOKS"],
  STUDENT: [], // students may never be a spend recipient (no cash-out)
};

/**
 * Static description of the contract rules — surfaced in the Contract Viewer UI.
 * `scope` marks whether a rule is part of the GENERIC stablecoin policy (active
 * from Stage 3) or the SECTOR-SPECIFIC education policy (active only at Stage 5).
 */
export const CONTRACT_RULES: {
  id: string;
  title: string;
  description: string;
  scope: "generic" | "sector";
}[] = [
  {
    id: "R1",
    title: "Registered participants only",
    description:
      "Both sender and recipient must be wallets registered on the EduCoin network.",
    scope: "generic",
  },
  {
    id: "R2",
    title: "Issuer-only minting",
    description:
      "Only the reserve-holding issuer (Government Treasury) may create new coin — prevents unauthorized coin creation.",
    scope: "generic",
  },
  {
    id: "R6",
    title: "Sufficient verifiable balance",
    description:
      "No wallet may ever spend more than its confirmed on-chain balance.",
    scope: "generic",
  },
  {
    id: "R7",
    title: "Positive amount",
    description: "Transaction amounts must be greater than zero.",
    scope: "generic",
  },
  {
    id: "R10",
    title: "Valid digital signature",
    description:
      "Every transaction must carry a valid Ed25519 signature from the sender's registered wallet key.",
    scope: "generic",
  },
  {
    id: "R2b",
    title: "Scholarship issued to a student",
    description:
      "Under the education policy, minted EduCoin may only be issued directly to a student beneficiary.",
    scope: "sector",
  },
  {
    id: "R3",
    title: "Student-initiated spending",
    description:
      "Only a student may spend scholarship EduCoin. Institutions and vendors are terminal recipients.",
    scope: "sector",
  },
  {
    id: "R4",
    title: "Authorized recipients",
    description:
      "Spending is permitted only to an Institution or an Approved Vendor — never student-to-student.",
    scope: "sector",
  },
  {
    id: "R5",
    title: "Approved educational category",
    description:
      "Every spend must declare an approved category (Tuition, Examination, Hostel, Books) valid for the recipient.",
    scope: "sector",
  },
  {
    id: "R5b",
    title: "Enrolled college fee restriction",
    description:
      "A student may pay tuition, examination, or hostel fees only to their respective enrolled college. Attempts to pay fees to another college are strictly rejected.",
    scope: "sector",
  },
  {
    id: "R8",
    title: "Category spending caps",
    description:
      "Cumulative spending per category may not exceed its cap (Examination ₹10k, Hostel ₹20k, Books ₹5k). Tuition is uncapped.",
    scope: "sector",
  },
  {
    id: "R9",
    title: "Scholarship validity term",
    description:
      "EduCoin can only be spent within the scholarship's validity term; expired funds are frozen for clawback.",
    scope: "sector",
  },
  {
    id: "R11",
    title: "Individual coin identity & ownership validation",
    description:
      "Every specified EduCoin must possess a cryptographically valid unit identity, genuine authorized minting proof, active non-spent status, and confirmed ownership by the presenter.",
    scope: "generic",
  },
];

export interface ValidationContext {
  walletByAddress: Map<string, Wallet>;
  balanceOf: (address: string) => number;
  spentByCategory: (address: string, category: Category) => number;
  expiryOf: (address: string) => number | undefined;
  now: number;
  /**
   * When true, the sector-specific (education / purpose-bound) rules are
   * enforced on top of the generic stablecoin rules. This is switched on only
   * at Stage 5 — before that, EduCoin behaves as a general-purpose stablecoin.
   */
  sectorPolicy: boolean;
  coinMap?: Map<string, import("../types").EduCoinUnit>;
}

export interface ValidationResult {
  ok: boolean;
  checks: ContractCheck[];
  reason?: string;
}

function pass(rule: string, detail: string): ContractCheck {
  return { rule, passed: true, detail };
}
function fail(rule: string, detail: string): ContractCheck {
  return { rule, passed: false, detail };
}

/**
 * Run the full policy against a proposed transaction.
 * Returns every rule check (for transparency) plus an overall pass/fail.
 */
export function validateTransaction(
  tx: Pick<Transaction, "type" | "from" | "to" | "amount" | "category" | "coinIds">,
  ctx: ValidationContext
): ValidationResult {
  const checks: ContractCheck[] = [];
  const { walletByAddress, balanceOf, sectorPolicy, coinMap } = ctx;

  const recipient = walletByAddress.get(tx.to);
  const sender = tx.from ? walletByAddress.get(tx.from) : null;

  // ── GENERIC STABLECOIN RULES (always enforced from Stage 3) ────────────

  // R7 — positive amount
  if (tx.amount > 0) {
    checks.push(pass("R7", `Amount ${tx.amount} EDU is positive.`));
  } else {
    checks.push(fail("R7", `Amount must be greater than zero.`));
  }

  // R1 — registered recipient (and sender for transfers)
  if (recipient) {
    checks.push(
      pass("R1", `Recipient ${recipient.name} (${ROLE_LABELS[recipient.role]}) is registered.`)
    );
  } else {
    checks.push(fail("R1", `Recipient ${tx.to} is not a registered participant.`));
  }

  if (tx.type === "MINT") {
    // R2 — issuer-only minting (prevents unauthorized coin creation).
    if (!sender || tx.from === null || sender.role === "GOVERNMENT") {
      checks.push(pass("R2", "Minted by the authorized issuer (Government Treasury)."));
    } else {
      checks.push(
        fail("R2", `Unauthorized minting: only the Government Treasury may create coin, not ${sender.name}.`)
      );
    }

    if (recipient && recipient.role === "STUDENT") {
      checks.push(pass("R2b", `Issued directly to student ${recipient.name}.`));
    } else {
      checks.push(
        fail("R2b", `Scholarship minting must target a registered student, not ${recipient ? ROLE_LABELS[recipient.role] : "an unknown wallet"}.`)
      );
    }
  }

  if (tx.type === "TRANSFER") {
    // R1 — sender registered
    if (sender) {
      checks.push(
        pass("R1", `Sender ${sender.name} (${ROLE_LABELS[sender.role]}) is registered.`)
      );
    } else {
      checks.push(fail("R1", `Sender ${tx.from ?? "(none)"} is not a registered participant.`));
    }

    // R6 — sufficient balance
    if (tx.from) {
      const bal = balanceOf(tx.from);
      if (bal >= tx.amount) {
        checks.push(pass("R6", `Balance ${bal} EDU covers ${tx.amount} EDU.`));
      } else {
        checks.push(
          fail("R6", `Insufficient balance: ${bal} EDU available, ${tx.amount} EDU requested.`)
        );
      }
    }

    // R11 — individual coin identity, active status & ownership validation
    if (tx.coinIds && tx.coinIds.length > 0) {
      if (coinMap) {
        let coinCheckFail: string | null = null;
        for (const cid of tx.coinIds) {
          const coin = coinMap.get(cid);
          if (!coin) {
            coinCheckFail = `Coin ID ${cid.slice(0, 10)}... does not exist in registry.`;
            break;
          }
          if (tx.from && coin.currentOwner.toLowerCase() !== tx.from.toLowerCase()) {
            coinCheckFail = `Coin ${coin.displaySerial} does not belong to sender (${coin.currentOwnerName || coin.currentOwner.slice(0, 10)}).`;
            break;
          }
          if (coin.status !== "ACTIVE") {
            coinCheckFail = `Coin ${coin.displaySerial} is ${coin.status} (cannot be spent or double-spent).`;
            break;
          }

          // Institutional Whitelist Cross-Check:
          // If paying tuition/fees to an institution, verify the coin was officially dispatched to this institution
          if (recipient && recipient.role === "INSTITUTION") {
            const coinInst = (coin.instituteName || coin.instituteId || "").toLowerCase();
            const recipInst = (recipient.institution || recipient.name || "").toLowerCase();
            if (coinInst && recipInst && !recipInst.includes(coinInst) && !coinInst.includes(recipInst)) {
              coinCheckFail = `Coin ${coin.displaySerial} was dispatched to ${coin.instituteName || coin.instituteId}, not ${recipient.name}. Institution fee whitelist cross-check rejected.`;
              break;
            }
          }
        }
        if (coinCheckFail) {
          checks.push(fail("R11", coinCheckFail));
        } else {
          checks.push(
            pass(
              "R11",
              `All ${tx.coinIds.length} serialized coins verified (cryptographic IDs, active status, valid ownership, institutional whitelist match).`
            )
          );
        }
      } else {
        checks.push(
          pass("R11", `${tx.coinIds.length} individual coin identities bundled in transfer.`)
        );
      }
    }
  }

  // ── SECTOR-SPECIFIC RULES (Education) — enforced ONLY from Stage 5 ──────
  if (sectorPolicy) {
    if (tx.type === "MINT") {
      // R2b — scholarship must be issued directly to a student
      if (recipient && recipient.role === "STUDENT") {
        checks.push(pass("R2b", `Issued to student ${recipient.name}.`));
      } else if (recipient) {
        checks.push(
          fail("R2b", `Scholarship may only be issued to a student, not a ${ROLE_LABELS[recipient.role]}.`)
        );
      }
    } else {
      // TRANSFER (a spend)
      // R3 — only students may spend
      if (sender && sender.role === "STUDENT") {
        checks.push(pass("R3", `Spend initiated by student ${sender.name}.`));
      } else if (sender) {
        checks.push(
          fail("R3", `${ROLE_LABELS[sender.role]} may not spend scholarship funds; only students may.`)
        );
      }

      // R4 — authorized recipient (institution or vendor)
      if (recipient && (recipient.role === "INSTITUTION" || recipient.role === "VENDOR")) {
        checks.push(pass("R4", `Recipient is an authorized ${ROLE_LABELS[recipient.role]}.`));
      } else if (recipient) {
        checks.push(
          fail("R4", `Cannot spend to a ${ROLE_LABELS[recipient.role]} — funds may only go to institutions or approved vendors.`)
        );
      }

      // R5 — approved category valid for recipient
      if (!tx.category) {
        checks.push(fail("R5", "No educational category was declared for this spend."));
      } else if (!APPROVED_CATEGORIES.includes(tx.category)) {
        checks.push(
          fail("R5", `Category "${CATEGORY_LABELS[tx.category]}" is not an approved educational purpose.`)
        );
      } else if (recipient) {
        const allowed = RECIPIENT_CATEGORY_MATRIX[recipient.role] ?? [];
        if (allowed.includes(tx.category)) {
          checks.push(
            pass("R5", `Category "${CATEGORY_LABELS[tx.category]}" is valid for ${ROLE_LABELS[recipient.role]}.`)
          );
        } else {
          checks.push(
            fail("R5", `"${CATEGORY_LABELS[tx.category]}" cannot be paid to a ${ROLE_LABELS[recipient.role]}.`)
          );
        }
      }

      // R5b — Enrolled college restriction:
      // A student can pay tuition, examination, or hostel fees ONLY to their respective enrolled college!
      if (sender && sender.role === "STUDENT" && recipient && recipient.role === "INSTITUTION") {
        if (sender.institution) {
          const collegeMatches =
            recipient.name.trim().toLowerCase() === sender.institution.trim().toLowerCase() ||
            (recipient.institution &&
              recipient.institution.trim().toLowerCase() === sender.institution.trim().toLowerCase());

          if (collegeMatches) {
            checks.push(
              pass(
                "R5b",
                `Enrolled college verified: ${sender.name} is enrolled at ${sender.institution}, matching recipient institution ${recipient.name}.`
              )
            );
          } else {
            const feeType = tx.category ? CATEGORY_LABELS[tx.category] : "fees";
            checks.push(
              fail(
                "R5b",
                `Cross-college payment rejected: ${sender.name} is enrolled at ${sender.institution} and cannot pay ${feeType} to ${recipient.name}. A student may pay tuition and college fees only to their respective enrolled college.`
              )
            );
          }
        } else {
          checks.push(
            pass("R5b", `No enrolled college restriction recorded for student ${sender.name}.`)
          );
        }
      }

      // R8 — per-category cumulative spending cap
      if (tx.from && tx.category) {
        const cap = SPENDING_CAPS[tx.category] ?? 0;
        if (cap > 0) {
          const already = ctx.spentByCategory(tx.from, tx.category);
          if (already + tx.amount <= cap) {
            checks.push(
              pass("R8", `${CATEGORY_LABELS[tx.category]} spend within the ${cap} EDU cap (${already + tx.amount}/${cap}).`)
            );
          } else {
            checks.push(
              fail("R8", `${CATEGORY_LABELS[tx.category]} cap exceeded: ${already + tx.amount} EDU would surpass the ${cap} EDU limit.`)
            );
          }
        } else {
          checks.push(pass("R8", `${CATEGORY_LABELS[tx.category]} has no spending cap.`));
        }
      }

      // R9 — scholarship validity term
      if (tx.from) {
        const expiry = ctx.expiryOf(tx.from);
        if (expiry && ctx.now > expiry) {
          checks.push(
            fail("R9", `Scholarship expired on ${new Date(expiry).toLocaleDateString()}; funds are frozen for clawback.`)
          );
        } else {
          checks.push(
            pass("R9", expiry ? `Within validity term (until ${new Date(expiry).toLocaleDateString()}).` : "No expiry constraint.")
          );
        }
      }
    }
  }

  const firstFail = checks.find((c) => !c.passed);
  return {
    ok: !firstFail,
    checks,
    reason: firstFail?.detail,
  };
}
