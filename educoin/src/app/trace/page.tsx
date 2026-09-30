"use client";

import { useMemo, useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { LockedPage } from "@/components/LockedPage";
import { Card, SectionTitle, EDU, Badge, CategoryBadge, Empty } from "@/components/ui";

export default function TracePage() {
  const { enabled } = useStage();
  const { data } = useChainData();
  const [student, setStudent] = useState("");

  const students = useMemo(() => (data?.wallets ?? []).filter((w) => w.role === "STUDENT"), [data]);
  const allTx = useMemo(() => (data?.chain ?? []).flatMap((b) => b.transactions), [data]);

  if (!enabled("traceability")) return <LockedPage feature="traceability" />;

  const issued = allTx.filter((t) => t.type === "MINT" && t.to === student);
  const spent = allTx.filter((t) => t.type === "TRANSFER" && t.from === student);
  const totalIssued = issued.reduce((s, t) => s + t.amount, 0);
  const totalSpent = spent.reduce((s, t) => s + t.amount, 0);
  const remaining = totalIssued - totalSpent;
  const nameOf = (addr: string) => data?.wallets.find((w) => w.address === addr)?.name ?? addr;
  const pct = totalIssued > 0 ? Math.round((totalSpent / totalIssued) * 100) : 0;

  const selected = students.find((s) => s.address === student);

  return (
    <div className="space-y-6">
      <SectionTitle
        icon="🧭"
        title="Fund Tracing"
        subtitle="Follow every rupee of a scholarship from the moment it is issued to the exact educational expense it was spent on — full end-to-end traceability."
      />

      <Card className="p-4">
        <label className="mb-1 block text-xs font-medium text-slate-500">Select a student to trace</label>
        <select
          value={student}
          onChange={(e) => setStudent(e.target.value)}
          className="w-full max-w-md rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        >
          <option value="">Choose a student…</option>
          {students.map((s) => (
            <option key={s.address} value={s.address}>
              {s.name} {s.institution ? `· ${s.institution}` : ""}
            </option>
          ))}
        </select>
      </Card>

      {!student ? (
        <Empty>Select a student above to see their scholarship trace.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Issued</div>
              <div className="mt-1 text-xl font-bold text-emerald-600">{totalIssued.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Utilized</div>
              <div className="mt-1 text-xl font-bold text-amber-600">{totalSpent.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Remaining</div>
              <div className="mt-1 text-xl font-bold text-brand-600">{remaining.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Utilization</div>
              <div className="mt-1 text-xl font-bold text-slate-700">{pct}%</div>
            </Card>
          </div>

          {/* Utilization bar */}
          <Card className="p-5">
            <div className="mb-2 text-sm font-semibold text-slate-800">
              Utilization of {selected?.name}'s scholarship
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {totalSpent.toLocaleString()} of {totalIssued.toLocaleString()} EDU spent on approved education.
            </div>
          </Card>

          {/* Flow */}
          <Card className="p-5">
            <div className="mb-4 text-sm font-semibold text-slate-800">Issuance → Utilization flow</div>

            <div className="space-y-4">
              {/* Issuance */}
              {issued.map((tx) => (
                <div key={tx.id} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    🏛️
                  </div>
                  <div className="flex-1 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Scholarship issued by Government</span>
                      <EDU amount={tx.amount} />
                    </div>
                    {tx.memo && <div className="text-xs text-slate-400">{tx.memo}</div>}
                  </div>
                </div>
              ))}

              {spent.length > 0 && (
                <div className="ml-4 border-l-2 border-dashed border-slate-200 pl-6">
                  <div className="space-y-3">
                    {spent.map((tx) => (
                      <div key={tx.id} className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                          {tx.category === "BOOKS" ? "📚" : tx.category === "HOSTEL" ? "🏠" : tx.category === "EXAMINATION" ? "📝" : "🎓"}
                        </div>
                        <div className="flex-1 rounded-xl border border-slate-100 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm text-slate-700">
                              Paid to <b>{nameOf(tx.to)}</b>
                            </span>
                            <div className="flex items-center gap-2">
                              <CategoryBadge category={tx.category} />
                              <EDU amount={tx.amount} />
                            </div>
                          </div>
                          {tx.memo && <div className="mt-0.5 text-xs text-slate-400">{tx.memo}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {remaining > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    💰
                  </div>
                  <div className="text-sm text-slate-500">
                    <Badge color="blue">Unspent</Badge> <EDU amount={remaining} /> still available for
                    approved educational use.
                  </div>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
