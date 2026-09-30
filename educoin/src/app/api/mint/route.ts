import { NextResponse } from "next/server";
import { getChain, saveChain } from "@/lib/blockchain/store";
import { getRequestStage } from "@/lib/serverStage";

export const dynamic = "force-dynamic";

/** Government issuance of new EduCoin to a student (minting). */
export async function POST(req: Request) {
  const stage = getRequestStage(req);
  const body = await req.json().catch(() => ({}));
  const { to, amount, memo, from, studentId, academicLevel, academicCompletionDate } = body as {
    to?: string;
    amount?: number;
    memo?: string;
    from?: string | null;
    studentId?: string;
    academicLevel?: string;
    academicCompletionDate?: number | string;
  };

  if (!to || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "A valid student wallet and positive amount are required." }, { status: 400 });
  }

  const chain = await getChain();
  const govt = chain.state.wallets.find((w) => w.role === "GOVERNMENT");
  const recipient = chain.getWallet(to);

  if (!govt) {
    return NextResponse.json({ error: "Government Treasury wallet is not available." }, { status: 403 });
  }

  if (!recipient || recipient.role !== "STUDENT") {
    return NextResponse.json({ error: "Only a registered student may receive issuance." }, { status: 403 });
  }

  if (from && from !== govt.address) {
    return NextResponse.json({ error: "Only the Government Treasury can initiate minting." }, { status: 403 });
  }

  if (studentId) recipient.studentId = studentId;
  if (academicLevel) recipient.academicLevel = academicLevel;
  if (academicCompletionDate) {
    const parsed = typeof academicCompletionDate === "string" ? Date.parse(academicCompletionDate) : academicCompletionDate;
    if (!Number.isNaN(parsed)) recipient.academicCompletionDate = parsed;
  }

  const result = chain.submit(
    {
      type: "MINT",
      from: govt.address,
      to,
      amount,
      category: "ISSUANCE",
      memo,
    },
    stage
  );
  await saveChain();
  return NextResponse.json(result, { status: result.accepted ? 200 : 422 });
}
