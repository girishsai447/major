import { NextResponse } from "next/server";
import { getChain, saveChain } from "@/lib/blockchain/store";
import { getRequestStage } from "@/lib/serverStage";

export const dynamic = "force-dynamic";

/**
 * Government issuance of new EduCoin:
 * 1. Puzzle + Nonce + Minting Block + Allocation Record (Supervisor specification)
 * 2. Or standard mempool submission for legacy viva stages.
 */
export async function POST(req: Request) {
  const stage = getRequestStage(req);
  const body = await req.json().catch(() => ({}));
  const chain = await getChain();

  const {
    studentId,
    amountCoins,
    governmentAuthorityId = "GOV-MINISTRY-EDU",
    // Legacy fields
    to,
    amount,
    memo,
    from,
    academicLevel,
    academicCompletionDate,
  } = body as {
    studentId?: string;
    amountCoins?: number;
    governmentAuthorityId?: string;
    to?: string;
    amount?: number;
    memo?: string;
    from?: string | null;
    academicLevel?: string;
    academicCompletionDate?: number | string;
  };

  // Check role: Government is the ONLY authority allowed to initiate coin generation
  const authHeader = req.headers.get("x-authority-role") || "GOVERNMENT";
  if (authHeader && authHeader !== "GOVERNMENT" && authHeader !== "ADMIN") {
    return NextResponse.json(
      { error: "Access denied. Only authenticated Government authority can initiate coin generation." },
      { status: 403 }
    );
  }

  // --- Path A: Supervisor's Core Generation (Student + Puzzle + Nonce + Block)
  if (studentId || (typeof amountCoins === "number" && amountCoins > 0)) {
    const coins = amountCoins ?? amount ?? 0;
    if (!studentId || coins <= 0) {
      return NextResponse.json(
        { error: "A valid student selection and positive coin amount are required." },
        { status: 400 }
      );
    }

    const genResult = chain.generateCoins({
      studentId,
      amountCoins: coins,
      governmentAuthorityId,
    });

    if (!genResult.success) {
      return NextResponse.json({ error: genResult.error }, { status: 422 });
    }

    await saveChain();
    return NextResponse.json(
      {
        accepted: true,
        generationRecord: genResult.generationRecord,
        mintingBlock: genResult.mintingBlock,
        auditRecord: genResult.auditRecord,
      },
      { status: 200 }
    );
  }

  // --- Path B: Legacy wallet minting (for backward compatibility)
  if (!to || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json(
      { error: "A valid student wallet and positive amount are required." },
      { status: 400 }
    );
  }

  const govt = chain.state.wallets.find((w) => w.role === "GOVERNMENT");
  const recipient = chain.getWallet(to);

  if (!govt) {
    return NextResponse.json(
      { error: "Government Treasury wallet is not available." },
      { status: 403 }
    );
  }

  if (!recipient || recipient.role !== "STUDENT") {
    return NextResponse.json(
      { error: "Only a registered student may receive issuance." },
      { status: 403 }
    );
  }

  if (from && from !== govt.address) {
    return NextResponse.json(
      { error: "Only the Government Treasury can initiate minting." },
      { status: 403 }
    );
  }

  if (academicLevel) recipient.academicLevel = academicLevel;
  if (academicCompletionDate) {
    const parsed =
      typeof academicCompletionDate === "string"
        ? Date.parse(academicCompletionDate)
        : academicCompletionDate;
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
