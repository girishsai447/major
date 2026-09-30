import { NextResponse } from "next/server";
import { getChain, saveChain } from "@/lib/blockchain/store";
import { getRequestStage } from "@/lib/serverStage";
import { snapshot } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/** Government deposits INR into the reserve that backs circulating EduCoin. */
export async function POST(req: Request) {
  const stage = getRequestStage(req);
  const body = await req.json().catch(() => ({}));
  const { amount } = body as { amount?: number };
  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "A positive amount is required." }, { status: 400 });
  }
  const chain = await getChain();
  chain.depositReserve(amount);
  await saveChain();
  return NextResponse.json(snapshot(chain, stage));
}
