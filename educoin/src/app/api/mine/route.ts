import { NextResponse } from "next/server";
import { getChain, saveChain } from "@/lib/blockchain/store";

export const dynamic = "force-dynamic";

/** Mine all pending transactions into a new block via proof-of-work. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { minerName } = body as { minerName?: string };

  const chain = await getChain();
  const result = chain.mine(minerName || "EduCoin Validator");
  if (!result) {
    return NextResponse.json(
      { error: "No pending transactions to mine." },
      { status: 422 }
    );
  }
  await saveChain();
  return NextResponse.json({
    block: result.block,
    hashes: result.hashes,
    ms: result.ms,
  });
}
