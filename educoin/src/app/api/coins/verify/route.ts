import { NextResponse } from "next/server";
import { getChain } from "@/lib/blockchain/store";

export const dynamic = "force-dynamic";

/**
 * 7-point cryptographic authenticity & ownership verification endpoint.
 * Evaluates individual coins or batch of coins for:
 * 1. Existence in verified ledger
 * 2. Authorized Government Issuer genesis
 * 3. Cryptographic hash preimage & Merkle batch integrity
 * 4. Current ownership by presenter
 * 5. Double-spending & spent status
 * 6. Unbroken provenance lineage
 * 7. Fixed denomination & valuation (₹100 INR/coin)
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { coinIds, expectedOwner, simulateTamper } = body as {
    coinIds?: string[];
    expectedOwner?: string;
    simulateTamper?: boolean;
  };

  if (!coinIds || !Array.isArray(coinIds) || coinIds.length === 0) {
    return NextResponse.json(
      { error: "At least one coinId must be provided in an array." },
      { status: 400 }
    );
  }

  const chain = await getChain();
  const targetIds = [...coinIds];

  // If user requested counterfeit test simulation, inject an unauthorized/fake coin ID
  if (simulateTamper) {
    targetIds.push("0x99999999fakecoin00000000unauthorizedcounterfeitdeadbeef");
  }

  const verificationResult = chain.verifyCoinBatch(targetIds, expectedOwner);

  return NextResponse.json({
    ...verificationResult,
    simulatedTamperApplied: !!simulateTamper,
  });
}
