import { NextResponse } from "next/server";
import { resetChain } from "@/lib/blockchain/store";
import { getRequestStage } from "@/lib/serverStage";
import { snapshot } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/** Rebuild the chain from scratch. `seed:true` re-seeds the demo scenario. */
export async function POST(req: Request) {
  const stage = getRequestStage(req);
  const body = await req.json().catch(() => ({}));
  const { seed } = body as { seed?: boolean };
  const chain = await resetChain(seed !== false);
  return NextResponse.json(snapshot(chain, stage));
}
