import { NextResponse } from "next/server";
import { getChain, saveChain } from "@/lib/blockchain/store";
import { getRequestStage } from "@/lib/serverStage";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

/** A student spends EduCoin on an approved educational purpose. */
export async function POST(req: Request) {
  const stage = getRequestStage(req);
  const body = await req.json().catch(() => ({}));
  const { from, to, amount, category, memo } = body as {
    from?: string;
    to?: string;
    amount?: number;
    category?: Category;
    memo?: string;
  };

  if (!from || !to || typeof amount !== "number") {
    return NextResponse.json(
      { error: "Sender, recipient and amount are required." },
      { status: 400 }
    );
  }

  const chain = await getChain();
  const result = chain.submit(
    { type: "TRANSFER", from, to, amount, category: category ?? null, memo },
    stage
  );
  await saveChain();
  return NextResponse.json(result, { status: result.accepted ? 200 : 422 });
}
