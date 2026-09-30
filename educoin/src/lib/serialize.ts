import { Blockchain } from "./blockchain/blockchain";
import type { Stage } from "@/config/stage";

/** Build the full JSON snapshot the client consumes for every screen. */
export function snapshot(chain: Blockchain, stage: Stage) {
  const integrity = chain.validateChain();
  const balances = chain.balances();
  const confirmed = chain.allTransactions().filter((t) => t.status === "CONFIRMED");
  const circulating = chain.circulatingSupply();
  const effectiveTime = chain.getEffectiveTime();
  const auditVerification = chain.verifyAuditLedger();
  const remainingCapacity = chain.remainingMintingCapacity();

  // Never leak private keys to the client.
  const publicWallets = chain.state.wallets.map((w) => {
    const copy = { ...w };
    delete copy.privateKey;
    return copy;
  });

  const totalCoinsGenerated = chain.state.generationRecords.reduce(
    (s, g) => s + g.coinsDisplay,
    0
  );
  const totalCoinsBurned = chain.state.burnRecords.reduce(
    (s, b) => s + b.coinsBurnedDisplay,
    0
  );
  const totalInrReturned = chain.state.burnRecords.reduce(
    (s, b) => s + b.inrReturned,
    0
  );
  const expiredCheck = chain.getExpiredGenerations(effectiveTime);

  return {
    stage,
    effectiveTime,
    demoClockOffsetMs: chain.state.demoClockOffsetMs || 0,
    meta: {
      createdAt: chain.state.createdAt,
      difficulty: chain.state.difficulty,
      height: chain.state.chain.length,
      mempoolSize: chain.state.mempool.length,
      walletCount: chain.state.wallets.length,
      txCount: chain.allTransactions().length,
      rejectedCount: chain.state.rejected.length,
      totalIssued: confirmed
        .filter((t) => t.type === "MINT")
        .reduce((s, t) => s + t.amount, 0),
      totalSpent: confirmed
        .filter((t) => t.type === "TRANSFER")
        .reduce((s, t) => s + t.amount, 0),
      totalSettled: confirmed
        .filter((t) => t.type === "SETTLE")
        .reduce((s, t) => s + t.amount, 0),
      totalClawedBack: confirmed
        .filter((t) => t.type === "CLAWBACK")
        .reduce((s, t) => s + t.amount, 0),
    },
    govMetrics: {
      totalReserveINR: chain.state.reserveINR,
      maxReserveBackedCoins: chain.maximumReserveBackedCoins(),
      totalCoinsGenerated,
      remainingMintingCapacity: remainingCapacity.wholeCoins,
      studentCount: chain.state.students.length,
      generationCount: chain.state.generationRecords.length,
      totalCoinsBurned,
      circulatingCoins: remainingCapacity.circulatingCoinsDisplay,
      totalInrReturned,
      expiredCoinsPendingBurnCount: expiredCheck.eligibleForBurn.length,
    },
    reserve: {
      reserveINR: chain.state.reserveINR,
      circulating,
      collateralRatio: chain.collateralRatio(),
      backed: chain.state.reserveINR >= circulating * 100,
    },
    integrity,
    auditVerification,
    chain: chain.state.chain,
    mintingBlocks: chain.state.mintingBlocks,
    generationRecords: chain.state.generationRecords,
    burnRecords: chain.state.burnRecords,
    auditLedger: chain.state.auditLedger,
    students: chain.state.students,
    mempool: chain.state.mempool,
    wallets: publicWallets,
    balances,
    rejected: chain.state.rejected,
  };
}

export type Snapshot = ReturnType<typeof snapshot>;
