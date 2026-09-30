import { NextResponse } from "next/server";
import { getChain, saveChain } from "@/lib/blockchain/store";
import { getRequestStage } from "@/lib/serverStage";
import { snapshot } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/**
 * TAMPER LAB (educational).
 *
 * Deliberately alter the amount of a transaction inside an already-mined block
 * WITHOUT re-mining it. The block's stored hash no longer matches its contents,
 * so the chain-integrity validator will flag the tampering — demonstrating why
 * a blockchain is tamper-evident. Use "Re-seed" to restore a clean chain.
 */
export async function POST(req: Request) {
  const stage = getRequestStage(req);
  const body = await req.json().catch(() => ({}));
  const { blockIndex, txIndex, newAmount } = body as {
    blockIndex?: number;
    txIndex?: number;
    newAmount?: number;
  };

  const chain = await getChain();
  const block = chain.state.chain[blockIndex ?? -1];
  if (!block || typeof txIndex !== "number" || !block.transactions[txIndex]) {
    return NextResponse.json({ error: "Invalid block or transaction index." }, { status: 400 });
  }

  const tx = block.transactions[txIndex];
  const before = tx.amount;
  tx.amount = typeof newAmount === "number" ? newAmount : before + 10000;
  await saveChain();

  return NextResponse.json({
    tampered: { blockIndex, txIndex, before, after: tx.amount },
    snapshot: snapshot(chain, stage),
  });
}
