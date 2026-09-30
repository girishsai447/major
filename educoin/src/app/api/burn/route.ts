import { NextResponse } from "next/server";
import { getChain, saveChain } from "@/lib/blockchain/store";

export const dynamic = "force-dynamic";

/**
 * Government trigger to burn expired EduCoin from a generation record
 * and atomically return the INR value (100 INR per coin) to the reserve.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { generationId, governmentUserId = "GOV-MINISTRY-EDU" } = body as {
    generationId?: string;
    governmentUserId?: string;
  };

  const authHeader = req.headers.get("x-authority-role") || "GOVERNMENT";
  if (authHeader && authHeader !== "GOVERNMENT" && authHeader !== "ADMIN") {
    return NextResponse.json(
      { error: "Access denied. Only authenticated Government authority can trigger coin burns." },
      { status: 403 }
    );
  }

  if (!generationId) {
    return NextResponse.json({ error: "generationId is required." }, { status: 400 });
  }

  const chain = await getChain();
  const result = chain.burnExpiredCoins({ generationId, governmentUserId });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  await saveChain();
  return NextResponse.json(result, { status: 200 });
}
