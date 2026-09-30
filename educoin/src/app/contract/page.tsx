"use client";

import { useMemo, useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { api, type ContractCheck } from "@/lib/api";
import { LockedPage } from "@/components/LockedPage";
import { Card, SectionTitle, Button, Badge, Stat } from "@/components/ui";
import { CONTRACT_RULES, RECIPIENT_CATEGORY_MATRIX } from "@/lib/blockchain/smartContract";
import { APPROVED_CATEGORIES, CATEGORY_LABELS, ROLE_LABELS, type Category } from "@/lib/types";

export default function ContractPage() {
  const { enabled } = useStage();
  const { data } = useChainData();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState<Category>("TUITION");
  const [amount, setAmount] = useState(1000);
  const [checks, setChecks] = useState<ContractCheck[] | null>(null);
  const [verdict, setVerdict] = useState<null | boolean>(null);

  const students = useMemo(() => (data?.wallets ?? []).filter((w) => w.role === "STUDENT"), [data]);
  const everyone = data?.wallets ?? [];

  const sectorOn = enabled("sectorPolicy");
  const activeRules = sectorOn
    ? CONTRACT_RULES
    : CONTRACT_RULES.filter((r) => r.scope === "generic");

  if (!enabled("smartContract")) return <LockedPage feature="smartContract" />;

  const run = async (over?: Partial<{ from: string; to: string; category: Category; amount: number }>) => {
    const payload = {
      from: over?.from ?? from,
      to: over?.to ?? to,
      category: over?.category ?? category,
      amount: over?.amount ?? amount,
    };
    if (over) {
      setFrom(payload.from);
      setTo(payload.to);
      setCategory(payload.category);
      setAmount(payload.amount);
    }
    if (!payload.from || !payload.to) return;
    const res = await api.validate({ type: "TRANSFER", ...payload });
    setChecks(res.checks);
    setVerdict(res.ok);
  };

  // Build quick scenario presets from seeded wallets.
  const student = students[0];
  const student2 = students[1];
  const inst = everyone.find((w) => w.role === "INSTITUTION");
  const vendor = everyone.find((w) => w.role === "VENDOR");

  return (
    <div className="space-y-6">
      <SectionTitle
        icon="📜"
        title={sectorOn ? "EduCoin Smart Contract — Education Policy" : "EduCoin Smart Contract — Core Policy"}
        subtitle={
          sectorOn
            ? "The full policy governing every transaction — generic stablecoin rules PLUS the sector-specific education rules: authorized participants and approved educational purposes only."
            : "The deterministic core policy engine: registered participants, sufficient balance, positive amounts and valid digital signatures. Sector-specific education rules are introduced in Stage 5."
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Enforced rules" value={activeRules.length} accent="#8b5cf6" />
        <Stat label="Rule set" value={sectorOn ? "Education" : "Generic"} accent={sectorOn ? "#10b981" : "#0ea5e9"} />
        <Stat label="Rejected attempts" value={data?.meta.rejectedCount ?? 0} accent="#e11d48" />
        <Stat label="Policy status" value="🟢 Active" accent="#10b981" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Rules */}
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold text-slate-800">
            Contract rules {sectorOn ? "" : "(generic stablecoin)"}
          </div>
          <div className="space-y-2.5">
            {activeRules.map((r) => (
              <div key={r.id} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                <span
                  className={`mono flex h-6 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                    r.scope === "sector" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"
                  }`}
                >
                  {r.id}
                </span>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    {r.title}
                    {r.scope === "sector" && <Badge color="green">education</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">{r.description}</div>
                </div>
              </div>
            ))}
          </div>

          {sectorOn && (
            <>
              <div className="mt-4 text-sm font-semibold text-slate-800">Category ↔ recipient matrix</div>
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Recipient role</th>
                      <th className="px-3 py-2 font-medium">Accepts categories</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["INSTITUTION", "VENDOR", "STUDENT"] as const).map((role) => (
                      <tr key={role} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-600">{ROLE_LABELS[role]}</td>
                        <td className="px-3 py-2">
                          {RECIPIENT_CATEGORY_MATRIX[role].length === 0 ? (
                            <span className="text-rose-500">— none (cannot receive spends)</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {RECIPIENT_CATEGORY_MATRIX[role].map((c) => (
                                <Badge key={c} color="blue">
                                  {CATEGORY_LABELS[c]}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>

        {/* Simulator */}
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            🧪 Policy Simulator
            <Badge color="slate">no state change</Badge>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              >
                <option value="">From…</option>
                {everyone.map((w) => (
                  <option key={w.address} value={w.address}>
                    {w.name} ({w.role})
                  </option>
                ))}
              </select>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              >
                <option value="">To…</option>
                {everyone.map((w) => (
                  <option key={w.address} value={w.address}>
                    {w.name} ({w.role})
                  </option>
                ))}
              </select>
              {sectorOn && (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                >
                  {APPROVED_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mono rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </div>

            <Button onClick={() => run()} disabled={!from || !to} className="w-full">
              Evaluate against contract
            </Button>

            {/* Preset scenarios — education rule violations (Stage 5 only) */}
            {sectorOn && (
            <div className="flex flex-wrap gap-1.5">
              {student && inst && (
                <button
                  onClick={() => run({ from: student.address, to: inst.address, category: "TUITION", amount: 10000 })}
                  className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  ✓ Valid tuition
                </button>
              )}
              {student && student2 && (
                <button
                  onClick={() => run({ from: student.address, to: student2.address, category: "TUITION", amount: 1000 })}
                  className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  ✗ Student → student
                </button>
              )}
              {student && vendor && (
                <button
                  onClick={() => run({ from: student.address, to: vendor.address, category: "TUITION", amount: 1000 })}
                  className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  ✗ Tuition → vendor
                </button>
              )}
              {student && everyone.find((w) => w.role === "INSTITUTION" && w.name !== student.institution) && (
                <button
                  onClick={() => {
                    const otherInst = everyone.find(
                      (w) => w.role === "INSTITUTION" && w.name !== student.institution
                    );
                    if (otherInst) {
                      run({ from: student.address, to: otherInst.address, category: "TUITION", amount: 10000 });
                    }
                  }}
                  className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                  title="A student trying to pay tuition fees to a different college"
                >
                  ✗ Wrong college tuition (R5b)
                </button>
              )}
              {student && inst && (
                <button
                  onClick={() => run({ from: student.address, to: inst.address, category: "HOSTEL", amount: 9_999_999 })}
                  className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  ✗ Overspend
                </button>
              )}
            </div>
            )}

            {verdict !== null && (
              <div
                className={`rounded-xl px-3 py-2 text-sm font-medium ${
                  verdict ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                }`}
              >
                {verdict ? "✓ ACCEPTED — all rules pass." : "✗ REJECTED — a rule failed."}
              </div>
            )}

            {checks && (
              <div className="space-y-1.5 rounded-xl border border-slate-100 p-3">
                {checks.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={c.passed ? "text-emerald-600" : "text-rose-600"}>
                      {c.passed ? "✓" : "✗"}
                    </span>
                    <span className="mono text-slate-400">{c.rule}</span>
                    <span className={c.passed ? "text-slate-600" : "text-rose-600"}>{c.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
