import { NextResponse } from "next/server";
import { getChain } from "@/lib/blockchain/store";
import { validateTransaction } from "@/lib/blockchain/smartContract";
import { getRequestStage } from "@/lib/serverStage";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Dry-run a transaction against the smart contract WITHOUT changing state.
 * Powers the live "Policy Simulator" so viewers can see exactly which rules
 * pass or fail for any proposed transfer.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { type, from, to, amount, category } = body as {
    type?: "MINT" | "TRANSFER";
    from?: string | null;
    to?: string;
    amount?: number;
    category?: Category | null;
  };

  if (!to || typeof amount !== "number") {
    return NextResponse.json({ error: "Recipient and amount are required." }, { status: 400 });
  }

  const stage = getRequestStage(req);
  const chain = await getChain();
  const result = validateTransaction(
    {
      type: type ?? "TRANSFER",
      from: from ?? null,
      to,
      amount,
      category: category ?? null,
    },
    chain.contractContext(stage)
  );
  return NextResponse.json(result);
}
