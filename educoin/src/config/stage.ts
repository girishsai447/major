/**
 * ============================================================================
 *  EduCoin — STAGE CONTROL CENTER
 * ============================================================================
 *
 *  This is the ONLY file you edit to move the project between demonstration
 *  stages for your professor.  Every feature is written and shipped; a stage
 *  simply decides which features are *unlocked* and visible.  Nothing is ever
 *  deleted — raising the stage progressively reveals more of the application.
 *
 *  ---------------------------------------------------------------------------
 *  HOW TO USE (the "simple change in code"):
 *
 *    1.  Set CURRENT_STAGE below to any value from 1 to 5.
 *    2.  Save the file. The running app hot-reloads to that stage.
 *
 *  ---------------------------------------------------------------------------
 *  THE FIVE STAGES (one review milestone per month)
 *
 *    Stage 1 — Blockchain Foundation
 *              Block structure, SHA-256 hashing, proof-of-work mining,
 *              chain-integrity validation, block explorer.
 *
 *    Stage 2 — EduCoin Issuance & Wallets
 *              Participants & roles, Government minting of EduCoin,
 *              wallets, balances and basic transfers on-chain.
 *
 *    Stage 3 — Smart Contract Restrictions
 *              Authorized-participant rules, approved educational categories
 *              (tuition / examination / hostel), automatic rejection of
 *              unauthorized or non-educational transactions.
 *
 *    Stage 4 — Traceability & Dashboards
 *              End-to-end fund tracing (issuance -> utilization), role-based
 *              dashboards, analytics and a tamper-evident audit trail.
 *
 *    Stage 5 — Complete Application
 *              Admin console, reports, notifications, guided presentation and
 *              the fully polished end-to-end system.
 *
 *  ---------------------------------------------------------------------------
 *  DEMO MODE (hidden, for live academic presentations)
 *
 *    Set DEMO_MODE = true to seed a rich, realistic scholarship scenario and
 *    enable the on-screen presenter overlay + guided tour.
 *
 *    You can also toggle Demo Mode at runtime without touching code:
 *    press the secret key sequence  D E M O  on any page.
 * ============================================================================
 */

export type Stage = 1 | 2 | 3 | 4 | 5;

/** 👉  CHANGE THIS SINGLE VALUE (1–5) TO SWITCH STAGES. */
export const CURRENT_STAGE: Stage = 5;

/** 👉  Set to true to enable the hidden academic-presentation Demo Mode. */
export const DEMO_MODE: boolean = true;

/**
 * Every gated capability in the app and the stage at which it unlocks.
 * Add features here — never remove them — as the project matures.
 */
export const FEATURE_STAGE = {
  // ── Stage 1 — Blockchain Foundation (generic) ──────────────────────────
  "blockchain.core": 1,
  "blockchain.mining": 1,
  "blockchain.explorer": 1,
  "blockchain.validation": 1,
  "blockchain.merkle": 1,
  "blockchain.tamperLab": 1,

  // ── Stage 2 — Digital Currency, Reserve & Policy Rules ─────────────────
  // These are the features needed for the project objectives:
  // 1) mint a stable blockchain-backed currency for sector requirements
  // 2) define the transaction rules / boundaries of the mined stable currency.
  "wallets": 2,
  "minting": 2,
  "transfers": 2,
  "ledger": 2,
  "signatures": 2,
  "stablecoin": 2,
  "reserve": 2,
  "smartContract": 2,
  "contractViewer": 2,

  // ── Stage 3 — Later governance / extended controls ───────────────────────
  // The core policy engine here enforces only GENERIC rules: registered
  // participants, sufficient balance, positive amount, valid signature.

  // ── Stage 4 — Traceability, Settlement & Admin (generic) ───────────────
  "traceability": 4,
  "dashboards": 4,
  "analytics": 4,
  "auditTrail": 4,
  "settlement": 4,
  "txSearch": 4,
  "adminConsole": 4,
  "reports": 4,
  "notifications": 4,
  "personas": 4,
  "guidedDemo": 4,

  // ── Stage 5 — SECTOR-SPECIFIC REQUIREMENT (Education / Scholarships) ────
  // Everything that turns the general stablecoin into purpose-bound EduCoin
  // is introduced here — and ONLY here.
  "sectorPolicy": 5, // master switch for the education rule-set
  "categories": 5, // approved educational categories
  "policyRejection": 5, // rejection of unauthorized / non-educational spends
  "spendingCaps": 5, // per-category caps
  "expiry": 5, // time-bound scholarships + clawback
  "fraudAlerts": 5, // education-specific anomaly detection
  "whitepaper": 5, // education tokenomics document
} as const;

export type FeatureKey = keyof typeof FEATURE_STAGE;

/** Human-readable metadata for each stage (used across the UI). */
export const STAGE_META: Record<
  Stage,
  { title: string; month: string; tagline: string; color: string }
> = {
  1: {
    title: "Blockchain Foundation",
    month: "Month 1",
    tagline: "Blocks, SHA-256 hashing, proof-of-work mining & chain validation.",
    color: "#6366f1",
  },
  2: {
    title: "Digital Currency, Reserve & Policy Rules",
    month: "Month 2",
    tagline: "Minting, wallets, reserve backing, peg stability and smart-contract transaction boundaries.",
    color: "#0ea5e9",
  },
  3: {
    title: "Stablecoin & Reserve",
    month: "Month 3",
    tagline: "1:1 INR-backed peg, collateral reserve & the core policy engine.",
    color: "#8b5cf6",
  },
  4: {
    title: "Traceability & Settlement",
    month: "Month 4",
    tagline: "Fund tracing, analytics, audit trail, settlement & admin console.",
    color: "#f59e0b",
  },
  5: {
    title: "Sector-Specific Requirement",
    month: "Month 5",
    tagline: "Purpose-bound education layer: authorized participants, approved categories, caps & expiry.",
    color: "#10b981",
  },
};
