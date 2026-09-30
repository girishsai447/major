"use client";

import { useMemo } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { LockedPage } from "@/components/LockedPage";
import { Card, SectionTitle, Stat, Empty, Badge } from "@/components/ui";
import { CATEGORY_LABELS, SPENDING_CAPS, type Category } from "@/lib/types";

const CATEGORY_COLOR: Record<string, string> = {
  TUITION: "#1b6ff5",
  EXAMINATION: "#8b5cf6",
  HOSTEL: "#f59e0b",
  BOOKS: "#10b981",
  ISSUANCE: "#64748b",
};

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-40 shrink-0 truncate text-sm text-slate-600">{label}</div>
      <div className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
        <div className="flex h-full items-center justify-end rounded-md px-2 text-[11px] font-medium text-white" style={{ width: `${pct}%`, background: color }}>
          {value.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { enabled } = useStage();
  const { data } = useChainData();

  const analytics = useMemo(() => {
    const tx = (data?.chain ?? []).flatMap((b) => b.transactions).filter((t) => t.status === "CONFIRMED");
    const spends = tx.filter((t) => t.type === "TRANSFER");

    const byCategory: Record<string, number> = {};
    const byInstitution: Record<string, number> = {};
    const byStudent: Record<string, number> = {};

    for (const t of spends) {
      if (t.category) byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
      const inst = data?.wallets.find((w) => w.address === t.to)?.name ?? t.to;
      byInstitution[inst] = (byInstitution[inst] ?? 0) + t.amount;
      const stu = data?.wallets.find((w) => w.address === t.from)?.name ?? t.from ?? "?";
      byStudent[stu] = (byStudent[stu] ?? 0) + t.amount;
    }
    return { byCategory, byInstitution, byStudent };
  }, [data]);

  const alerts = useMemo(() => {
    if (!data) return [] as { level: "high" | "med"; text: string }[];
    const out: { level: "high" | "med"; text: string }[] = [];
    const nameOf = (a: string | null) =>
      (a && data.wallets.find((w) => w.address === a)?.name) || "Unknown";

    // Repeated rejected attempts by the same sender.
    const rejByFrom = new Map<string, number>();
    data.rejected.forEach((t) => {
      if (t.from) rejByFrom.set(t.from, (rejByFrom.get(t.from) ?? 0) + 1);
    });
    rejByFrom.forEach((count, addr) => {
      if (count >= 2)
        out.push({ level: "high", text: `${nameOf(addr)} has ${count} rejected transaction attempts — possible misuse.` });
    });

    // Expired scholarships still holding a balance.
    const now = Date.now();
    const mints = data.chain.flatMap((b) => b.transactions).filter((t) => t.type === "MINT");
    data.wallets
      .filter((w) => w.role === "STUDENT")
      .forEach((w) => {
        const exp = mints.filter((m) => m.to === w.address && m.expiresAt).map((m) => m.expiresAt!);
        const expiry = exp.length ? Math.max(...exp) : undefined;
        const bal = data.balances.find((b) => b.address === w.address)?.balance ?? 0;
        if (expiry && now > expiry && bal > 0)
          out.push({ level: "med", text: `${w.name}'s scholarship expired with ${bal.toLocaleString()} EDU unused — eligible for clawback.` });
      });

    // Near-cap category spending (≥ 80% of a cap).
    const spends = data.chain.flatMap((b) => b.transactions).filter((t) => t.type === "TRANSFER");
    const byStudentCat = new Map<string, number>();
    spends.forEach((t) => {
      if (t.from && t.category) byStudentCat.set(`${t.from}|${t.category}`, (byStudentCat.get(`${t.from}|${t.category}`) ?? 0) + t.amount);
    });
    byStudentCat.forEach((amt, key) => {
      const [addr, cat] = key.split("|") as [string, Category];
      const cap = SPENDING_CAPS[cat] ?? 0;
      if (cap > 0 && amt >= 0.8 * cap && amt <= cap)
        out.push({ level: "med", text: `${nameOf(addr)} has used ${amt.toLocaleString()}/${cap.toLocaleString()} EDU of the ${CATEGORY_LABELS[cat]} cap.` });
    });

    return out;
  }, [data]);

  if (!enabled("dashboards")) return <LockedPage feature="dashboards" />;

  const catEntries = Object.entries(analytics.byCategory).sort((a, b) => b[1] - a[1]);
  const instEntries = Object.entries(analytics.byInstitution).sort((a, b) => b[1] - a[1]);
  const studentEntries = Object.entries(analytics.byStudent).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCat = Math.max(1, ...catEntries.map((e) => e[1]));
  const maxInst = Math.max(1, ...instEntries.map((e) => e[1]));
  const maxStu = Math.max(1, ...studentEntries.map((e) => e[1]));

  const issued = data?.meta.totalIssued ?? 0;
  const spent = data?.meta.totalSpent ?? 0;
  const utilPct = issued > 0 ? Math.round((spent / issued) * 100) : 0;

  return (
    <div className="space-y-6">
      <SectionTitle
        icon="📊"
        title="Analytics"
        subtitle="A live view of how scholarship EduCoin flows across the network — issuance versus utilization, and spending by category, institution and student."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Issued" value={issued.toLocaleString()} accent="#10b981" />
        <Stat label="Utilized" value={spent.toLocaleString()} accent="#f59e0b" />
        <Stat label="Utilization" value={`${utilPct}%`} accent="#1b6ff5" />
        <Stat label="Participants" value={data?.meta.walletCount ?? 0} />
      </div>

      {enabled("fraudAlerts") && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">🚨 Fraud & anomaly alerts</span>
            <Badge color={alerts.length ? "red" : "green"}>{alerts.length} active</Badge>
          </div>
          {alerts.length === 0 ? (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              ✓ No anomalies detected. All activity is within policy.
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${
                    a.level === "high" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <span>{a.level === "high" ? "🔴" : "🟠"}</span>
                  <span>{a.text}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 text-sm font-semibold text-slate-800">Spending by category</div>
          {catEntries.length === 0 ? (
            <Empty>No spending recorded yet.</Empty>
          ) : (
            <div className="space-y-2.5">
              {catEntries.map(([cat, val]) => (
                <BarRow
                  key={cat}
                  label={CATEGORY_LABELS[cat as Category] ?? cat}
                  value={val}
                  max={maxCat}
                  color={CATEGORY_COLOR[cat] ?? "#64748b"}
                />
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 text-sm font-semibold text-slate-800">Received by institution / vendor</div>
          {instEntries.length === 0 ? (
            <Empty>No payments recorded yet.</Empty>
          ) : (
            <div className="space-y-2.5">
              {instEntries.map(([inst, val]) => (
                <BarRow key={inst} label={inst} value={val} max={maxInst} color="#1b6ff5" />
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 text-sm font-semibold text-slate-800">Issuance vs. utilization</div>
          <div className="space-y-3">
            <BarRow label="Issued" value={issued} max={Math.max(issued, spent, 1)} color="#10b981" />
            <BarRow label="Utilized" value={spent} max={Math.max(issued, spent, 1)} color="#f59e0b" />
            <BarRow label="Remaining" value={Math.max(0, issued - spent)} max={Math.max(issued, spent, 1)} color="#1b6ff5" />
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 text-sm font-semibold text-slate-800">Top spenders (students)</div>
          {studentEntries.length === 0 ? (
            <Empty>No spending recorded yet.</Empty>
          ) : (
            <div className="space-y-2.5">
              {studentEntries.map(([stu, val]) => (
                <BarRow key={stu} label={stu} value={val} max={maxStu} color="#8b5cf6" />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
