"use client";

import Link from "next/link";
import { FEATURE_STAGE, STAGE_META } from "@/config/stage";
import type { FeatureKey } from "@/config/features";
import { Card } from "./ui";

export function LockedPage({ feature }: { feature: FeatureKey }) {
  const stage = FEATURE_STAGE[feature];
  const meta = STAGE_META[stage as 1 | 2 | 3 | 4 | 5];
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
        🔒
      </div>
      <h1 className="text-xl font-semibold text-slate-800">This feature unlocks in Stage {stage}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
        <span className="font-medium" style={{ color: meta.color }}>
          {meta.month} — {meta.title}.
        </span>{" "}
        {meta.tagline}
      </p>
      <Card className="mx-auto mt-6 max-w-sm p-4 text-left text-sm text-slate-500">
        To reveal it now, open the <b>Stage Selector</b> (bottom-right) and pick Stage {stage}, or
        set <code className="mono rounded bg-slate-100 px-1">CURRENT_STAGE = {stage}</code> in{" "}
        <code className="mono">src/config/stage.ts</code>.
      </Card>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Back to Home
        </Link>
        <Link href="/roadmap" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          View Roadmap
        </Link>
      </div>
    </div>
  );
}
