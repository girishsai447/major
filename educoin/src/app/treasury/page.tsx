"use client";

import { useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { api } from "@/lib/api";
import { LockedPage } from "@/components/LockedPage";
import { Card, SectionTitle, Button, Stat, Badge } from "@/components/ui";

export default function TreasuryPage() {
  const { enabled } = useStage();
  const { data, refresh } = useChainData();
  const [amount, setAmount] = useState(100000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!enabled("reserve")) return <LockedPage feature="reserve" />;

  const reserve = data?.reserve;
  const ratio = reserve?.collateralRatio ?? 1;
  const ratioPct = Math.round(ratio * 100);
  const healthy = (reserve?.backed ?? true) && ratio >= 1;

  const deposit = async () => {
    if (amount <= 0) return;
    setBusy(true);
    try {
      await api.depositReserve(amount);
      await refresh();
      setMsg(`✅ Deposited ₹${amount.toLocaleString()} into the reserve.`);
      setTimeout(() => setMsg(null), 3500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        icon="🏦"
        title="Reserve & Peg"
        subtitle="EduCoin is a stablecoin: each EDU is backed by ₹100 of INR held in the Government reserve. New EduCoin can only be minted while the reserve remains sufficient to support the full peg."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Reserve (INR)" value={`₹${(reserve?.reserveINR ?? 0).toLocaleString()}`} accent="#10b981" />
        <Stat label="Circulating EDU" value={(reserve?.circulating ?? 0).toLocaleString()} accent="#1b6ff5" />
        <Stat
          label="Collateral ratio"
          value={`${ratioPct}%`}
          accent={healthy ? "#10b981" : "#e11d48"}
          hint={healthy ? "fully backed" : "under-collateralised"}
        />
        <Stat label="Peg" value="1 EDU = ₹100" hint="fixed" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Collateral gauge */}
        <Card className="p-6 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">Collateralisation</div>
            <Badge color={healthy ? "green" : "red"}>{healthy ? "🟢 Healthy" : "🔴 Breach"}</Badge>
          </div>
          <div className="relative h-6 w-full overflow-hidden rounded-full bg-slate-100">
            {/* 100% marker */}
            <div className="absolute inset-y-0 left-1/2 z-10 w-px bg-slate-400/60" title="100% — fully backed" />
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, ratioPct / 2)}%`,
                background: healthy
                  ? "linear-gradient(90deg,#34d399,#059669)"
                  : "linear-gradient(90deg,#fb7185,#e11d48)",
              }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-400">
            <span>0%</span>
            <span>100% (fully backed)</span>
            <span>200%</span>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            {reserve?.reserveINR.toLocaleString()} INR in reserve backs{" "}
            {reserve?.circulating.toLocaleString()} EDU in circulation. A ratio at or above 100%
            guarantees every EduCoin can be redeemed for a rupee — so the token never de-pegs.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Issued" value={data?.meta.totalIssued ?? 0} />
            <MiniStat label="Utilised" value={data?.meta.totalSpent ?? 0} />
            <MiniStat label="Settled" value={data?.meta.totalSettled ?? 0} />
            <MiniStat label="Reclaimed" value={data?.meta.totalClawedBack ?? 0} />
          </div>
        </Card>

        {/* Deposit */}
        <Card className="p-6">
          <div className="text-sm font-semibold text-slate-800">Fund the reserve</div>
          <p className="mt-1 text-xs text-slate-500">
            The Government deposits INR to expand backing capacity, allowing more EduCoin to be
            issued while keeping the peg intact.
          </p>
          <label className="mt-4 mb-1 block text-xs font-medium text-slate-500">Amount (INR)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mono w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <Button onClick={deposit} disabled={busy} variant="success" className="mt-3 w-full">
            🏦 Deposit to reserve
          </Button>
          {msg && <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</div>}
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            Try issuing more than the reserve can back on the <b>Issue Scholarship</b> page — the
            mint is rejected to protect the peg.
          </div>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-100 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mono mt-0.5 text-sm font-semibold text-slate-700">{value.toLocaleString()}</div>
    </div>
  );
}
