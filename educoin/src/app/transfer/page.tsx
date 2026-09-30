"use client";

import { useMemo, useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { api, type ContractCheck } from "@/lib/api";
import { LockedPage } from "@/components/LockedPage";
import { Card, SectionTitle, Button, EDU, Badge } from "@/components/ui";
import { APPROVED_CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/types";

function CheckList({ checks }: { checks: ContractCheck[] }) {
  return (
    <div className="space-y-1.5">
      {checks.map((c, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className={c.passed ? "text-emerald-600" : "text-rose-600"}>
            {c.passed ? "✓" : "✗"}
          </span>
          <span className="text-slate-400">{c.rule}</span>
          <span className={c.passed ? "text-slate-600" : "text-rose-600"}>{c.detail}</span>
        </div>
      ))}
    </div>
  );
}

export default function TransferPage() {
  const { enabled } = useStage();
  const { data, refresh } = useChainData();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState<Category>("TUITION");
  const [amount, setAmount] = useState(1000);
  const [memo, setMemo] = useState("");
  const [checks, setChecks] = useState<ContractCheck[] | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const policyOn = enabled("smartContract");
  const sectorOn = enabled("sectorPolicy");
  const everyone = data?.wallets ?? [];
  // Before Stage 5 EduCoin is a generic stablecoin — any wallet may send to any
  // wallet. From Stage 5 the education rules restrict senders/recipients.
  const senders = useMemo(
    () => (sectorOn ? everyone.filter((w) => w.role === "STUDENT") : everyone),
    [everyone, sectorOn]
  );
  const recipients = useMemo(
    () =>
      sectorOn
        ? everyone.filter((w) => w.role === "INSTITUTION" || w.role === "VENDOR")
        : everyone.filter((w) => w.address !== from),
    [everyone, sectorOn, from]
  );
  const fromBalance = data?.balances.find((b) => b.address === from)?.balance ?? 0;

  if (!enabled("transfers")) return <LockedPage feature="transfers" />;

  const simulate = async () => {
    if (!from || !to) return;
    const res = await api.validate({ type: "TRANSFER", from, to, amount, category });
    setChecks(res.checks);
  };

  const submit = async () => {
    if (!from || !to) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await api.transfer(from, to, amount, category, memo || undefined);
      setChecks(res.transaction.contractChecks ?? null);
      if (res.accepted) {
        setResult({ ok: true, text: "✅ Transaction accepted into the mempool. Mine to confirm." });
        setMemo("");
      } else {
        setResult({ ok: false, text: `❌ Rejected by smart contract: ${res.reason}` });
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const mineNow = async () => {
    setBusy(true);
    try {
      await api.mine();
      await refresh();
      setResult({ ok: true, text: "⛏️ Block mined — spend confirmed on-chain." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        icon="💸"
        title={sectorOn ? "Spend EduCoin" : "Transfer EduCoin"}
        subtitle={
          sectorOn
            ? "Students spend scholarship EduCoin on approved educational purposes. Every spend is checked against the education policy before it can enter a block."
            : policyOn
            ? "Send EduCoin between any registered wallets. Each transfer is checked for balance and a valid signature before it can enter a block."
            : "Move EduCoin between wallets. (The policy engine activates in Stage 3.)"
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                From {sectorOn ? "(student)" : "(sender)"}
              </label>
              <select
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setChecks(null);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              >
                <option value="">{sectorOn ? "Select a student…" : "Select a sender…"}</option>
                {senders.map((s) => (
                  <option key={s.address} value={s.address}>
                    {s.name}{sectorOn ? "" : ` · ${s.role}`}
                  </option>
                ))}
              </select>
              {from && (
                <div className="mt-1 text-xs text-slate-400">
                  Available balance: <EDU amount={fromBalance} />
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                To {sectorOn ? "(institution / vendor)" : "(recipient)"}
              </label>
              <select
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setChecks(null);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              >
                <option value="">Select a recipient…</option>
                {recipients.map((r) => (
                  <option key={r.address} value={r.address}>
                    {r.name} · {r.role.charAt(0) + r.role.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {sectorOn && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value as Category);
                      setChecks(null);
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                  >
                    {APPROVED_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Amount (EDU)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="mono w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Memo (optional)</label>
              <input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="e.g. Semester 5 tuition fee"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={submit} disabled={busy || !from || !to}>
                💸 Submit spend
              </Button>
              {policyOn && (
                <Button variant="outline" onClick={simulate} disabled={!from || !to}>
                  🔍 Check policy first
                </Button>
              )}
              <Button variant="ghost" onClick={mineNow} disabled={busy || (data?.meta.mempoolSize ?? 0) === 0}>
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
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">
              {policyOn ? "Smart-contract evaluation" : "Basic checks"}
            </span>
            {policyOn && <Badge color="violet">policy active</Badge>}
          </div>
          {checks ? (
            <CheckList checks={checks} />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              {policyOn
                ? "Fill the form and press “Check policy first” or “Submit spend” to see each rule evaluated live."
                : "Submit a transfer to see the result."}
            </div>
          )}

          {policyOn && (
            <div className="mt-4 rounded-lg bg-violet-50 p-3 text-xs text-violet-700">
              {sectorOn ? (
                <>
                  Try a rule violation on purpose — e.g. pay <b>Tuition</b> to a <b>Vendor</b>, or set
                  an amount above the balance — and watch the contract reject it.
                </>
              ) : (
                <>
                  Try setting an amount <b>above the sender's balance</b> — the core policy rejects it
                  on the balance and signature checks.
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
