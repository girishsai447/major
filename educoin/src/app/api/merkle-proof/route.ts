import { NextResponse } from "next/server";
import { getChain } from "@/lib/blockchain/store";
import { merkleProof, txHash } from "@/lib/blockchain/block";

export const dynamic = "force-dynamic";

/** Produce a Merkle inclusion proof for a transaction within a block. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { blockIndex, txIndex } = body as { blockIndex?: number; txIndex?: number };
  const chain = await getChain();
  const block = chain.state.chain[blockIndex ?? -1];
  if (!block || typeof txIndex !== "number" || !block.transactions[txIndex]) {
    return NextResponse.json({ error: "Invalid block or transaction index." }, { status: 400 });
  }
  const proof = merkleProof(block.transactions, txIndex);
  return NextResponse.json({
    blockIndex,
    txIndex,
    leaf: txHash(block.transactions[txIndex]),
    merkleRoot: block.merkleRoot,
    ...proof,
  });
}
