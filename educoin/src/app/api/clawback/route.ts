import { NextResponse } from "next/server";
import { getChain, saveChain } from "@/lib/blockchain/store";

export const dynamic = "force-dynamic";

/** Government reclaims the unspent balance of an expired scholarship. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { student } = body as { student?: string };
  if (!student) {
    return NextResponse.json({ error: "A student wallet is required." }, { status: 400 });
  }
  const chain = await getChain();
  const result = chain.clawback(student);
  await saveChain();
  return NextResponse.json(result, { status: result.accepted ? 200 : 422 });
}
