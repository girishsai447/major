"use client";

import { useMemo, useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { api } from "@/lib/api";
import { LockedPage } from "@/components/LockedPage";
import { Card, SectionTitle, Button, EDU, Badge, Empty, Stat } from "@/components/ui";

export default function SettlementsPage() {
  const { enabled } = useStage();
  const { data, refresh } = useChainData();
  const [redeemer, setRedeemer] = useState("");
  const [amount, setAmount] = useState(10000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const sectorOn = enabled("sectorPolicy");
  // Generic stablecoin: any holder may redeem coin for fiat. At Stage 5 the
  // holders redeeming are typically institutions / vendors.
  const recipients = useMemo(
    () =>
      (data?.wallets ?? []).filter((w) =>
        w.role === "GOVERNMENT"
          ? false
          : sectorOn
          ? w.role === "INSTITUTION" || w.role === "VENDOR"
          : (data?.balances.find((b) => b.address === w.address)?.balance ?? 0) > 0
      ),
    [data, sectorOn]
  );
  const balanceOf = (addr: string) => data?.balances.find((b) => b.address === addr)?.balance ?? 0;

  const redeemerCoins = useMemo(
    () =>
      ((data?.coins as import("@/lib/types").EduCoinUnit[]) ?? []).filter(
        (c) => c.currentOwner.toLowerCase() === redeemer.toLowerCase() && c.status === "ACTIVE"
      ),
    [data, redeemer]
  );

  // Students whose scholarship has expired but still hold a balance.
  const now = Date.now();
  const expiredStudents = useMemo(() => {
    const mints = (data?.chain ?? []).flatMap((b) => b.transactions).filter((t) => t.type === "MINT");
    return (data?.wallets ?? [])
      .filter((w) => w.role === "STUDENT")
      .map((w) => {
        const exp = mints.filter((m) => m.to === w.address && m.expiresAt).map((m) => m.expiresAt!);
        const expiry = exp.length ? Math.max(...exp) : undefined;
        return { wallet: w, expiry, balance: balanceOf(w.address) };
      })
      .filter((s) => s.expiry && now > s.expiry && s.balance > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const settlements = (data?.chain ?? [])
    .flatMap((b) => b.transactions)
    .filter((t) => t.type === "SETTLE" || t.type === "CLAWBACK")
    .reverse();

  if (!enabled("settlement")) return <LockedPage feature="settlement" />;

  const nameOf = (addr: string | null) =>
    (addr && data?.wallets.find((w) => w.address === addr)?.name) || "Government Treasury";

  const redeem = async () => {
    if (!redeemer || amount <= 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const selectedCoinIds = redeemerCoins.slice(0, amount).map((c) => c.coinId);
      const res = await api.settle(
        redeemer,
        amount,
        selectedCoinIds.length > 0 ? selectedCoinIds : undefined
      );
      if (res.accepted) {
        await api.mine("Settlement Node");
        setMsg({
          ok: true,
          text: `✅ Bank verified & settled ${amount} EduCoins — ₹${(
            amount * 100
          ).toLocaleString()} INR disbursed from reserve.`,
        });
      } else {
        setMsg({ ok: false, text: `❌ ${res.reason}` });
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const clawback = async (student: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.clawback(student);
      if (res.accepted) {
        await api.mine("Government Node");
        setMsg({ ok: true, text: "✅ Expired scholarship reclaimed to the Treasury." });
      } else {
        setMsg({ ok: false, text: `❌ ${res.reason}` });
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        icon="🔁"
        title={sectorOn ? "Settlements & Clawback" : "Redemption to Fiat"}
        subtitle={
          sectorOn
            ? "The end of the fund lifecycle. Institutions and vendors redeem received EduCoin back for real INR, and the Government reclaims scholarships that lapse unused — both remove EduCoin from circulation and keep the reserve exactly collateralised."
            : "The off-ramp. Any coin holder redeems EduCoin back to INR from the reserve — the coin is burned and the matching fiat is released, keeping the peg exactly collateralised. Every redemption is recorded on-chain."
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total settled" value={(data?.meta.totalSettled ?? 0).toLocaleString()} accent="#0ea5e9" />
        <Stat label="Total reclaimed" value={(data?.meta.totalClawedBack ?? 0).toLocaleString()} accent="#f59e0b" />
        <Stat label="Reserve (INR)" value={`₹${(data?.reserve.reserveINR ?? 0).toLocaleString()}`} accent="#10b981" />
        <Stat label="Circulating" value={(data?.reserve.circulating ?? 0).toLocaleString()} />
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-2.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Redemption */}
        <Card className="p-5">
          <div className="text-sm font-semibold text-slate-800">🏦 Redeem EduCoin for INR</div>
          <p className="mt-1 text-xs text-slate-500">
            {sectorOn
              ? "An institution or vendor converts its EduCoin holdings back to rupees (the off-ramp)."
              : "A coin holder converts EduCoin back to rupees from the reserve (the off-ramp)."}
          </p>
          <label className="mt-4 mb-1 block text-xs font-medium text-slate-500">Redeemer</label>
          <select
            value={redeemer}
            onChange={(e) => setRedeemer(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            <option value="">{sectorOn ? "Select institution / vendor…" : "Select a holder…"}</option>
            {recipients.map((r) => (
              <option key={r.address} value={r.address}>
                {r.name} · holds {balanceOf(r.address).toLocaleString()} EDU
              </option>
            ))}
          </select>
          {redeemer && redeemerCoins.length > 0 && (
            <div className="mt-2 rounded-xl bg-amber-50 p-2.5 border border-amber-200 text-xs text-amber-800">
              <span className="font-semibold">💎 Bank Settlement Audit Ready:</span> {redeemerCoins.length} active serialized coins held (valued at ₹{(redeemerCoins.length * 100).toLocaleString()} INR). The partner bank verifies each coin identity before releasing fiat INR.
            </div>
          )}
          <label className="mt-3 mb-1 block text-xs font-medium text-slate-500">Amount (EDU)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mono w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <Button onClick={redeem} disabled={busy || !redeemer} className="mt-3 w-full">
            🔁 Settle redemption
          </Button>
        </Card>

        {/* Clawback — education-specific (Stage 5) */}
        {enabled("expiry") && (
        <Card className="p-5">
          <div className="text-sm font-semibold text-slate-800">⏳ Reclaim expired scholarships</div>
          <p className="mt-1 text-xs text-slate-500">
            Scholarships have a validity term. When one lapses with funds unused, the Government can
            reclaim the remaining balance.
          </p>
          <div className="mt-4 space-y-2">
            {expiredStudents.length === 0 ? (
              <Empty>No expired scholarships with a remaining balance.</Empty>
            ) : (
              expiredStudents.map((s) => (
                <div key={s.wallet.address} className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium text-slate-700">{s.wallet.name}</div>
                    <div className="text-xs text-amber-600">
                      Expired {s.expiry ? new Date(s.expiry).toLocaleDateString() : ""} · <EDU amount={s.balance} /> unused
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => clawback(s.wallet.address)} disabled={busy}>
                    Reclaim
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
        )}
      </div>

      {/* History */}
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-3 text-sm font-semibold text-slate-800">
          Settlement & clawback history
        </div>
        {settlements.length === 0 ? (
          <div className="p-5">
            <Empty>No settlements or clawbacks yet.</Empty>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">From</th>
                <th className="px-5 py-2 text-right font-medium">Amount</th>
                <th className="px-5 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((tx) => (
                <tr key={tx.id} className="border-t border-[var(--border)]">
                  <td className="px-5 py-2">
                    <Badge color={tx.type === "SETTLE" ? "blue" : "amber"}>{tx.type}</Badge>
                  </td>
                  <td className="px-5 py-2 text-slate-600">{nameOf(tx.from)}</td>
                  <td className="mono px-5 py-2 text-right">{tx.amount.toLocaleString()}</td>
                  <td className="px-5 py-2 text-xs text-slate-400">{new Date(tx.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
