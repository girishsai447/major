"use client";

import { useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { api } from "@/lib/api";
import { LockedPage } from "@/components/LockedPage";
import {
  Card,
  SectionTitle,
  Button,
  Stat,
  Hash,
  RoleBadge,
  StatusBadge,
  CategoryBadge,
  EDU,
  Badge,
} from "@/components/ui";

export default function AdminPage() {
  const { enabled } = useStage();
  const { data, refresh } = useChainData();
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  if (!enabled("adminConsole")) return <LockedPage feature="adminConsole" />;

  const nameOf = (addr: string | null) =>
    (addr && data?.wallets.find((w) => w.address === addr)?.name) || (addr ? "—" : "Treasury");

  const everyTx = (data?.chain ?? []).flatMap((b) => b.transactions).reverse();
  const q = search.trim().toLowerCase();
  const allTx = q
    ? everyTx.filter((tx) =>
        [
          tx.type,
          tx.category ?? "",
          tx.id,
          tx.from ?? "",
          tx.to,
          nameOf(tx.from),
          nameOf(tx.to),
          String(tx.amount),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
    : everyTx;

  const reset = async (seed: boolean) => {
    setBusy(true);
    try {
      await api.reset(seed);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        icon="⚙️"
        title="Admin Console"
        subtitle="A single pane of glass over the entire EduCoin network — participants, balances, the full transaction ledger and chain integrity."
        right={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => reset(true)} disabled={busy}>
              ↻ Re-seed demo
            </Button>
            <Button variant="danger" onClick={() => reset(false)} disabled={busy}>
              Wipe chain
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Blocks" value={data?.meta.height ?? 0} />
        <Stat label="Participants" value={data?.meta.walletCount ?? 0} />
        <Stat label="Transactions" value={data?.meta.txCount ?? 0} />
        <Stat label="Rejected" value={data?.meta.rejectedCount ?? 0} accent="#e11d48" />
        <Stat
          label="Integrity"
          value={data?.integrity.valid ? "✔" : "✗"}
          accent={data?.integrity.valid ? "#10b981" : "#e11d48"}
        />
      </div>

      {/* Balances */}
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-3 text-sm font-semibold text-slate-800">
          Participant balances
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="px-5 py-2 font-medium">Participant</th>
                <th className="px-5 py-2 font-medium">Role</th>
                <th className="px-5 py-2 font-medium">Address</th>
                <th className="px-5 py-2 text-right font-medium">Received</th>
                <th className="px-5 py-2 text-right font-medium">Spent</th>
                <th className="px-5 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {data?.balances.map((b) => (
                <tr key={b.address} className="border-t border-[var(--border)]">
                  <td className="px-5 py-2 font-medium text-slate-700">{b.name}</td>
                  <td className="px-5 py-2">
                    <RoleBadge role={b.role} />
                  </td>
                  <td className="px-5 py-2">
                    <Hash value={b.address} chars={6} />
                  </td>
                  <td className="mono px-5 py-2 text-right text-emerald-600">{b.received.toLocaleString()}</td>
                  <td className="mono px-5 py-2 text-right text-amber-600">{b.spent.toLocaleString()}</td>
                  <td className="mono px-5 py-2 text-right font-semibold text-slate-800">{b.balance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Ledger */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-5 py-3">
          <span className="text-sm font-semibold text-slate-800">
            Full transaction ledger ({allTx.length})
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search by name, address, type, category, amount…"
            className="ml-auto w-72 max-w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-400"
          />
        </div>
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="px-5 py-2 font-medium">Block</th>
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">From</th>
                <th className="px-5 py-2 font-medium">To</th>
                <th className="px-5 py-2 text-right font-medium">Amount</th>
                <th className="px-5 py-2 font-medium">Purpose</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {allTx.map((tx) => (
                <tr key={tx.id} className="border-t border-[var(--border)]">
                  <td className="px-5 py-2">
                    <Badge color="slate">#{tx.blockIndex ?? "—"}</Badge>
                  </td>
                  <td className="px-5 py-2">
                    <Badge color={tx.type === "MINT" ? "green" : "blue"}>{tx.type}</Badge>
                  </td>
                  <td className="px-5 py-2 text-slate-600">{nameOf(tx.from)}</td>
                  <td className="px-5 py-2 text-slate-600">{nameOf(tx.to)}</td>
                  <td className="mono px-5 py-2 text-right">{tx.amount.toLocaleString()}</td>
                  <td className="px-5 py-2">
                    <CategoryBadge category={tx.category} />
                  </td>
                  <td className="px-5 py-2">
                    <StatusBadge status={tx.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
