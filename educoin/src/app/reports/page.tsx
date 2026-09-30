"use client";

import { useMemo } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { LockedPage } from "@/components/LockedPage";
import { Card, SectionTitle, Button } from "@/components/ui";
import { CATEGORY_LABELS, type Category } from "@/lib/types";

export default function ReportsPage() {
  const { enabled } = useStage();
  const { data } = useChainData();

  const report = useMemo(() => {
    const tx = (data?.chain ?? []).flatMap((b) => b.transactions).filter((t) => t.status === "CONFIRMED");
    const spends = tx.filter((t) => t.type === "TRANSFER");
    const byCategory: Record<string, number> = {};
    const byInstitution: Record<string, number> = {};
    for (const t of spends) {
      if (t.category) byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
      const inst = data?.wallets.find((w) => w.address === t.to)?.name ?? t.to;
      byInstitution[inst] = (byInstitution[inst] ?? 0) + t.amount;
    }
    return { byCategory, byInstitution, spendCount: spends.length };
  }, [data]);

  if (!enabled("reports")) return <LockedPage feature="reports" />;

  const issued = data?.meta.totalIssued ?? 0;
  const spent = data?.meta.totalSpent ?? 0;

  return (
    <div className="space-y-6">
      <SectionTitle
        icon="📄"
        title="Reports"
        subtitle="A committee-ready summary of scholarship disbursement and utilization. Use Print to export as PDF."
        right={
          <Button onClick={() => window.print()} variant="outline">
            🖨️ Print / Export PDF
          </Button>
        }
      />

      <Card className="p-8">
        {/* Report header */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-bold text-white">
              ₹
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">EduCoin — Scholarship Disbursement Report</div>
              <div className="text-xs text-slate-500">
                Generated {new Date().toLocaleString()} · Blockchain height {data?.meta.height ?? 0} ·
                Integrity {data?.integrity.valid ? "VALID ✔" : "BROKEN ✗"}
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Total issued", `${issued.toLocaleString()} EDU`],
            ["Total utilized", `${spent.toLocaleString()} EDU`],
            ["Utilization", issued ? `${Math.round((spent / issued) * 100)}%` : "0%"],
            ["Rejected attempts", String(data?.meta.rejectedCount ?? 0)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">{k}</div>
              <div className="mt-1 text-lg font-bold text-slate-800">{v}</div>
            </div>
          ))}
        </div>

        {/* By category */}
        <div className="mt-8">
          <div className="mb-2 text-sm font-semibold text-slate-800">Utilization by category</div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-400">
              <tr>
                <th className="py-2 font-medium">Category</th>
                <th className="py-2 text-right font-medium">Amount (EDU)</th>
                <th className="py-2 text-right font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(report.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                <tr key={cat} className="border-b border-slate-100">
                  <td className="py-2 text-slate-700">{CATEGORY_LABELS[cat as Category] ?? cat}</td>
                  <td className="mono py-2 text-right">{val.toLocaleString()}</td>
                  <td className="py-2 text-right text-slate-500">
                    {spent ? Math.round((val / spent) * 100) : 0}%
                  </td>
                </tr>
              ))}
              {Object.keys(report.byCategory).length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 text-center text-slate-400">No utilization recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* By institution */}
        <div className="mt-8">
          <div className="mb-2 text-sm font-semibold text-slate-800">Funds received by institution / vendor</div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-400">
              <tr>
                <th className="py-2 font-medium">Recipient</th>
                <th className="py-2 text-right font-medium">Amount (EDU)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(report.byInstitution).sort((a, b) => b[1] - a[1]).map(([inst, val]) => (
                <tr key={inst} className="border-b border-slate-100">
                  <td className="py-2 text-slate-700">{inst}</td>
                  <td className="mono py-2 text-right">{val.toLocaleString()}</td>
                </tr>
              ))}
              {Object.keys(report.byInstitution).length === 0 && (
                <tr>
                  <td colSpan={2} className="py-3 text-center text-slate-400">No payments recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-400">
          This report is generated directly from the on-chain EduCoin ledger. Every figure is
          independently verifiable via the Block Explorer. Chain integrity is validated by
          re-hashing and re-linking all blocks.
        </div>
      </Card>
    </div>
  );
}
