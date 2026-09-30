import {
  CURRENT_STAGE,
  FEATURE_STAGE,
  STAGE_META,
  type FeatureKey,
  type Stage,
} from "./stage";

/**
 * Pure, framework-agnostic feature-gating helpers.
 *
 * These accept an explicit `stage` so they work both on the server (using the
 * compile-time CURRENT_STAGE) and on the client (using the possibly
 * runtime-overridden stage from StageContext).
 */

export function isFeatureEnabled(
  feature: FeatureKey,
  stage: Stage = CURRENT_STAGE
): boolean {
  return stage >= FEATURE_STAGE[feature];
}

export function featureUnlockStage(feature: FeatureKey): Stage {
  return FEATURE_STAGE[feature] as Stage;
}

/** All features unlocked at or below the given stage. */
export function unlockedFeatures(stage: Stage = CURRENT_STAGE): FeatureKey[] {
  return (Object.keys(FEATURE_STAGE) as FeatureKey[]).filter((f) =>
    isFeatureEnabled(f, stage)
  );
}

/** Features that unlock at exactly this stage (i.e. new this milestone). */
export function featuresIntroducedAt(stage: Stage): FeatureKey[] {
  return (Object.keys(FEATURE_STAGE) as FeatureKey[]).filter(
    (f) => FEATURE_STAGE[f] === stage
  );
}

/** Friendly display names for every feature key (used across the UI). */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  "blockchain.core": "Blockchain data structure",
  "blockchain.mining": "Proof-of-work mining",
  "blockchain.explorer": "Block explorer",
  "blockchain.validation": "Chain-integrity validation",
  "blockchain.merkle": "Merkle proofs",
  "blockchain.tamperLab": "Tamper lab",
  wallets: "Participants & wallets",
  minting: "Government minting",
  transfers: "EduCoin transfers",
  ledger: "Balance ledger",
  signatures: "Digital signatures (Ed25519)",
  stablecoin: "Stablecoin peg (1 EDU = ₹100)",
  reserve: "Collateral reserve",
  smartContract: "Core policy engine",
  contractViewer: "Contract rule viewer",
  sectorPolicy: "Purpose-bound education policy",
  categories: "Approved educational categories",
  policyRejection: "Automatic rejection of violations",
  spendingCaps: "Per-category spending caps",
  expiry: "Time-bound scholarships",
  traceability: "End-to-end fund tracing",
  dashboards: "Role dashboards",
  analytics: "Analytics & charts",
  auditTrail: "Tamper-evident audit trail",
  settlement: "Settlement & clawback",
  fraudAlerts: "Fraud & anomaly alerts",
  txSearch: "Transaction search",
  adminConsole: "Admin console",
  reports: "Committee reports",
  notifications: "Notifications",
  guidedDemo: "Guided presentation",
  personas: "Persona switcher",
  whitepaper: "Whitepaper & tokenomics",
};

export { STAGE_META };
export type { FeatureKey, Stage };
