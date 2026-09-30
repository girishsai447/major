"use client";

import { useMemo, useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { api } from "@/lib/api";
import { LockedPage } from "@/components/LockedPage";
import { Card, SectionTitle, Button, EDU, Hash, Badge } from "@/components/ui";

export default function MintPage() {
  const { enabled } = useStage();
  const { data, refresh } = useChainData();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState(50000);
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const sectorOn = enabled("sectorPolicy");
  // Government minting is student-specific for this objective: issue only to registered students.
  const recipients = useMemo(
    () => (data?.wallets ?? []).filter((w) => w.role === "STUDENT"),
    [data]
  );

  if (!enabled("minting")) return <LockedPage feature="minting" />;

  const issue = async () => {
    if (!to || amount <= 0) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await api.mint(to, amount, memo || undefined);
      if (res.accepted) {
        setResult({ ok: true, text: "✅ Issuance queued in the mempool. Mine a block to confirm it." });
        setMemo("");
      } else {
        setResult({ ok: false, text: `❌ Rejected: ${res.reason}` });
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const mineNow = async () => {
    setBusy(true);
    try {
      await api.mine("Government Node");
      await refresh();
      setResult({ ok: true, text: "⛏️ Block mined — issuance confirmed on-chain." });
    } finally {
      setBusy(false);
    }
  };

  const recentIssuance = (data?.chain ?? [])
    .flatMap((b) => b.transactions)
    .filter((t) => t.type === "MINT")
    .reverse()
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <SectionTitle
        icon="🪙"
        title={sectorOn ? "Issue Scholarship (Mint EduCoin)" : "Mint EduCoin"}
        subtitle={
          sectorOn
            ? "Only the Government Treasury can create new EduCoin, and only directly to a student. This is the single point of issuance for scholarship funds."
            : "Government-only issuance: the Treasury selects a student, validates reserve backing, and mints only while the reserve remains sufficient for the required peg."
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                {sectorOn ? "Student (recipient)" : "Recipient wallet"}
              </label>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              >
                <option value="">{sectorOn ? "Select a student…" : "Select a wallet…"}</option>
                {recipients.map((s) => (
                  <option key={s.address} value={s.address}>
                    {s.name} {s.institution ? `· ${s.institution}` : sectorOn ? "" : `· ${s.role}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Amount (EDU)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mono w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Memo (optional)</label>
              <input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="e.g. Merit scholarship 2026–27"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={issue} disabled={busy || !to}>
                🪙 Issue EduCoin
              </Button>
              <Button variant="outline" onClick={mineNow} disabled={busy || (data?.meta.mempoolSize ?? 0) === 0}>
                ⛏️ Mine ({data?.meta.mempoolSize ?? 0})
              </Button>
            </div>
            {result && (
              <div
                className={`rounded-xl px-3 py-2 text-sm ${
                  result.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                }`}
              >
                {result.text}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold text-slate-800">Total issued to date</div>
          <div className="mt-1 text-3xl font-bold text-emerald-600">
            {(data?.meta.totalIssued ?? 0).toLocaleString()}{" "}
            <span className="text-base font-medium text-slate-400">EDU</span>
          </div>
          <div className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-400">
            Recent issuance
          </div>
          <div className="mt-2 space-y-2">
            {recentIssuance.length === 0 && (
              <div className="text-sm text-slate-400">No scholarships issued yet.</div>
            )}
            {recentIssuance.map((tx) => {
              const student = data?.wallets.find((w) => w.address === tx.to);
              return (
                <div key={tx.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge color="green">MINT</Badge>
                    <span className="text-slate-700">{student?.name ?? <Hash value={tx.to} />}</span>
                  </div>
                  <EDU amount={tx.amount} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
