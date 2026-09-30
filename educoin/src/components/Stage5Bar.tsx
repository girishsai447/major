"use client";

import { useMemo, useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { CATEGORY_LABELS, ROLE_LABELS } from "@/lib/types";

/**
 * Stage-5 top strip: a "persona" switcher (role-play as any participant) and a
 * live notifications feed of network activity. Both read from the shared chain
 * snapshot, so they stay in sync with everything else.
 */
export function Stage5Bar() {
  const { enabled } = useStage();
  const { data } = useChainData();
  const [persona, setPersona] = useState("");
  const [open, setOpen] = useState(false);

  const showPersona = enabled("personas");
  const showNotifs = enabled("notifications");

  const feed = useMemo(() => {
    if (!data) return [] as { id: string; text: string; kind: string; ts: number; parties: string[] }[];
    const nameOf = (a: string | null) =>
      (a && data.wallets.find((w) => w.address === a)?.name) || "Treasury";
    const confirmed = data.chain.flatMap((b) => b.transactions);
    const items = [
      ...confirmed.map((t) => {
        const parties = [t.from, t.to].filter(Boolean) as string[];
        let text = "";
        if (t.type === "MINT") text = `🪙 ${t.amount.toLocaleString()} EDU issued to ${nameOf(t.to)}`;
        else if (t.type === "TRANSFER")
          text = `💸 ${nameOf(t.from)} paid ${t.amount.toLocaleString()} EDU to ${nameOf(t.to)} (${t.category ? CATEGORY_LABELS[t.category] : "—"})`;
        else if (t.type === "SETTLE") text = `🔁 ${nameOf(t.from)} redeemed ${t.amount.toLocaleString()} EDU for INR`;
        else if (t.type === "CLAWBACK") text = `⏳ Reclaimed ${t.amount.toLocaleString()} EDU from ${nameOf(t.from)}`;
        return { id: t.id, text, kind: t.type, ts: t.timestamp, parties };
      }),
      ...data.rejected.map((t) => ({
        id: t.id,
        text: `🚫 Rejected: ${nameOf(t.from)} → ${nameOf(t.to)} (${t.rejectionReason ?? "policy"})`,
        kind: "REJECTED",
        ts: t.timestamp,
        parties: [t.from, t.to].filter(Boolean) as string[],
      })),
    ].sort((a, b) => b.ts - a.ts);
    return persona ? items.filter((i) => i.parties.includes(persona)) : items;
  }, [data, persona]);

  if (!showPersona && !showNotifs) return null;

  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] bg-white/70 px-4 py-1.5 text-xs backdrop-blur print:hidden">
      {showPersona && (
        <label className="flex items-center gap-2">
          <span className="text-slate-400">Acting as</span>
          <select
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-brand-400"
          >
            <option value="">Administrator (all)</option>
            {(data?.wallets ?? []).map((w) => (
              <option key={w.address} value={w.address}>
                {w.name} — {ROLE_LABELS[w.role]}
              </option>
            ))}
          </select>
        </label>
      )}

      {showNotifs && (
        <div className="relative ml-auto">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 hover:bg-slate-200"
          >
            🔔 Activity
            <span className="rounded-full bg-brand-600 px-1.5 text-[10px] text-white">{feed.length}</span>
          </button>
          {open && (
            <div className="absolute right-0 z-40 mt-2 max-h-96 w-96 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Network activity {persona && "· filtered"}
              </div>
              {feed.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">No activity.</div>
              ) : (
                feed.slice(0, 40).map((i) => (
                  <div
                    key={i.id}
                    className={`rounded-lg px-2 py-1.5 text-[13px] ${
                      i.kind === "REJECTED" ? "text-rose-600" : "text-slate-600"
                    } hover:bg-slate-50`}
                  >
                    {i.text}
                    <div className="text-[10px] text-slate-300">{new Date(i.ts).toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
