import { NextResponse } from "next/server";
import { getChain } from "@/lib/blockchain/store";
import { getRequestStage } from "@/lib/serverStage";
import { snapshot } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const chain = await getChain();
  const stage = getRequestStage(req);
  return NextResponse.json(snapshot(chain, stage));
}
