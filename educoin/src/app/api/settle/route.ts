import { NextResponse } from "next/server";
import { getChain, saveChain } from "@/lib/blockchain/store";

export const dynamic = "force-dynamic";

/** Institution / vendor redeems EduCoin back to the Government for INR. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { from, amount } = body as { from?: string; amount?: number };
  if (!from || typeof amount !== "number") {
    return NextResponse.json({ error: "Sender and amount are required." }, { status: 400 });
  }
  const chain = await getChain();
  const result = chain.settle(from, amount);
  await saveChain();
  return NextResponse.json(result, { status: result.accepted ? 200 : 422 });
}
