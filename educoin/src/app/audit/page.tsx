"use client";

import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { LockedPage } from "@/components/LockedPage";
import { Card, SectionTitle, Hash, EDU, Badge, CategoryBadge, Empty, Stat } from "@/components/ui";

export default function AuditPage() {
  const { enabled } = useStage();
  const { data } = useChainData();

  if (!enabled("auditTrail")) return <LockedPage feature="auditTrail" />;

  const rejected = data?.rejected ?? [];
  const confirmed = (data?.chain ?? []).flatMap((b) => b.transactions).filter((tx) => tx.status === "CONFIRMED");
  const auditEvents = [...confirmed, ...rejected].sort((a, b) => b.timestamp - a.timestamp).slice(0, 25);
  const nameOf = (addr: string | null) =>
    (addr && data?.wallets.find((w) => w.address === addr)?.name) || addr || "Treasury";

  return (
    <div className="space-y-6">
      <SectionTitle
        icon="🛡️"
        title="Audit Trail"
        subtitle="The live blockchain audit trail shows both accepted on-chain transactions and rejected attempts, so the most recent activity is always visible and the old seeded data disappears after a reset."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Rejected attempts" value={rejected.length} accent="#e11d48" />
        <Stat label="Confirmed on-chain" value={confirmed.length} accent="#10b981" />
        <Stat label="Total issued" value={(data?.meta.totalIssued ?? 0).toLocaleString()} />
        <Stat label="Total utilized" value={(data?.meta.totalSpent ?? 0).toLocaleString()} accent="#f59e0b" />
      </div>

      {auditEvents.length === 0 ? (
        <Empty>No blockchain activity yet. Mint or transfer a token to populate the audit trail.</Empty>
      ) : (
        <div className="space-y-3">
          {auditEvents.map((tx) => {
            const isRejected = tx.status === "REJECTED";
            return (
              <Card key={`${tx.id}-${tx.status}`} className={isRejected ? "border-rose-100 p-4" : "border-emerald-100 p-4"}>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge color={isRejected ? "red" : "green"}>{isRejected ? "REJECTED" : "CONFIRMED"}</Badge>
                  <span className="text-sm font-medium text-slate-700">
                    {nameOf(tx.from)} <span className="text-slate-300">→</span> {nameOf(tx.to)}
                  </span>
                  <EDU amount={tx.amount} />
                  <CategoryBadge category={tx.category} />
                  <span className="ml-auto text-xs text-slate-400">
                    {new Date(tx.timestamp).toLocaleString()}
                  </span>
                </div>
                {tx.memo && <div className="mt-1 text-xs italic text-slate-400">“{tx.memo}”</div>}
                {isRejected ? (
                  <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    <b>Reason:</b> {tx.rejectionReason}
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    <b>Accepted:</b> confirmed in a mined block.
                  </div>
                )}
                {tx.contractChecks && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tx.contractChecks.map((c, i) => (
                      <span
                        key={i}
                        className={`rounded-md px-2 py-0.5 text-[11px] ${
                          c.passed ? "bg-emerald-50 text-emerald-600" : "bg-rose-100 text-rose-700"
                        }`}
                        title={c.detail}
                      >
                        {c.passed ? "✓" : "✗"} {c.rule}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2">
                  <Hash value={tx.id} chars={8} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
