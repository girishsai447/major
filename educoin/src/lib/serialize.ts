import { Blockchain } from "./blockchain/blockchain";
import type { Stage } from "@/config/stage";

/** Build the full JSON snapshot the client consumes for every screen. */
export function snapshot(chain: Blockchain, stage: Stage) {
  const integrity = chain.validateChain();
  const balances = chain.balances();
  const confirmed = chain.allTransactions().filter((t) => t.status === "CONFIRMED");
  const circulating = chain.circulatingSupply();

  // Never leak private keys to the client.
  const publicWallets = chain.state.wallets.map((w) => {
    const copy = { ...w };
    delete copy.privateKey;
    return copy;
  });

  return {
    stage,
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
    reserve: {
      reserveINR: chain.state.reserveINR,
      circulating,
      collateralRatio: chain.collateralRatio(),
      backed: chain.state.reserveINR >= circulating * 100,
    },
    integrity,
    chain: chain.state.chain,
    mempool: chain.state.mempool,
    wallets: publicWallets,
    balances,
    rejected: chain.state.rejected,
  };
}

export type Snapshot = ReturnType<typeof snapshot>;
