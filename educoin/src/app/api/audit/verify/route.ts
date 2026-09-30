import { NextResponse } from "next/server";
import { getChain } from "@/lib/blockchain/store";

export const dynamic = "force-dynamic";

/**
 * Audit ledger verification endpoint: walks the cryptographic hash chain
 * from genesis to latest record and detects any tampering.
 */
export async function GET() {
  const chain = await getChain();
  const result = chain.verifyAuditLedger();
  return NextResponse.json(result, { status: 200 });
}

export async function POST() {
  const chain = await getChain();
  const result = chain.verifyAuditLedger();
  return NextResponse.json(result, { status: 200 });
}
