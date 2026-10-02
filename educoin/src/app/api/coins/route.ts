import { NextResponse } from "next/server";
import { getChain } from "@/lib/blockchain/store";

export const dynamic = "force-dynamic";

/**
 * Returns all serialized EduCoins or filtered by owner address, batch ID, or status.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner");
  const batchId = searchParams.get("batchId");
  const status = searchParams.get("status");

  const chain = await getChain();
  let coins = chain.getCoins();

  if (owner) {
    const target = owner.toLowerCase();
    coins = coins.filter((c) => c.currentOwner.toLowerCase() === target);
  }

  if (batchId) {
    coins = coins.filter((c) => c.batchId.toLowerCase() === batchId.toLowerCase());
  }

  if (status) {
    coins = coins.filter((c) => c.status.toLowerCase() === status.toLowerCase());
  }

  return NextResponse.json({
    total: coins.length,
    batches: chain.getBatches(),
    coins,
  });
}
