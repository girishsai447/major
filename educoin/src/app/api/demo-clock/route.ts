import { NextResponse } from "next/server";
import { getChain, saveChain } from "@/lib/blockchain/store";

export const dynamic = "force-dynamic";

/**
 * Demo clock control endpoint: lets presenter adjust effective time
 * or fast-forward +6 months, +1 year, or reset to live time.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { offsetDays, reset, targetDate } = body as {
    offsetDays?: number;
    reset?: boolean;
    targetDate?: string;
  };

  const chain = await getChain();

  if (reset) {
    chain.setDemoClockOffset(0);
  } else if (targetDate) {
    const targetMs = new Date(targetDate).getTime();
    if (!isNaN(targetMs)) {
      const diff = targetMs - Date.now();
      chain.setDemoClockOffset(diff);
    }
  } else if (typeof offsetDays === "number") {
    const offsetMs = (chain.state.demoClockOffsetMs || 0) + offsetDays * 86400 * 1000;
    chain.setDemoClockOffset(offsetMs);
  }

  await saveChain();

  return NextResponse.json({
    success: true,
    effectiveTime: chain.getEffectiveTime(),
    effectiveDate: new Date(chain.getEffectiveTime()).toISOString(),
    offsetMs: chain.state.demoClockOffsetMs || 0,
  });
}
