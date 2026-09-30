"use client";

import { useMemo, useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { api } from "@/lib/api";
import { LockedPage } from "@/components/LockedPage";
import {
  Card,
  SectionTitle,
  Button,
  Hash,
  RoleBadge,
  EDU,
  Empty,
  Spinner,
  Badge,
} from "@/components/ui";
import { ROLE_LABELS, type Role } from "@/lib/types";

const ROLES: Role[] = ["GOVERNMENT", "INSTITUTION", "STUDENT", "VENDOR"];

export default function WalletsPage() {
  const { enabled } = useStage();
  const { data, loading, refresh } = useChainData();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("STUDENT");
  const [institution, setInstitution] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const balanceMap = useMemo(() => {
    const m = new Map<string, number>();
    data?.balances.forEach((b) => m.set(b.address, b.balance));
    return m;
  }, [data]);

  // Compute allocated scholarship coins from supervisor's generation records
  const studentAllocations = useMemo(() => {
    const m = new Map<string, { totalAllocated: number; records: string[] }>();
    (data?.generationRecords ?? []).forEach((g) => {
      if (g.status === "GENERATED") {
        const studentKey = g.studentId || g.studentName;
        const cur = m.get(studentKey) ?? { totalAllocated: 0, records: [] };
        cur.totalAllocated += g.coinsDisplay;
        cur.records.push(g.generationId);
        m.set(studentKey, cur);

        // Also map by student name for fallback
        if (g.studentName && g.studentName !== studentKey) {
          m.set(g.studentName, cur);
        }
      }
    });
    return m;
  }, [data]);

  if (!enabled("wallets")) return <LockedPage feature="wallets" />;

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.createWallet(name.trim(), role, institution.trim() || undefined);
      if (res.error) setMsg(res.error);
      else {
        setMsg(`✅ Registered ${name.trim()} as ${ROLE_LABELS[role]}.`);
        setName("");
        setInstitution("");
        await refresh();
      }
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const wallets = data?.wallets ?? [];

  return (
    <div className="space-y-6">
      <SectionTitle
        icon="👥"
        title="Participants & Wallet Balances"
        subtitle="Every actor on the EduCoin network holds an identity and wallet. Under supervisor Requirement 10, newly generated scholarships exist as unlinked allocation records (GEN0000X) ready to be mapped to wallets by the future wallet team."
      />

      {/* Requirement 10 Informational Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 flex items-start gap-3">
        <span className="text-lg">ℹ️</span>
        <div>
          <span className="font-bold">Supervisor Phase Note (No Direct Wallet Transfer):</span>
          <p className="mt-0.5 text-blue-800 leading-relaxed">
            Newly issued coins are intentionally created as an official <b>Allocation Record (Status: GENERATED, Wallet Status: NOT LINKED)</b>.
            They are not automatically deposited into wallet balances because wallet creation belongs to the next phase handled by the wallet team.
            Allocations belonging to each student are displayed below with an <span className="font-semibold text-indigo-700">"Allocated (GEN)"</span> badge.
          </p>
        </div>
      </div>

      {/* Add participant */}
      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Verma"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Institution {role === "STUDENT" ? "" : "(optional)"}
            </label>
            <input
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. VNR VJIET"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={add} disabled={busy || !name.trim()}>
              {busy ? "Adding…" : "+ Register"}
            </Button>
          </div>
        </div>
        {msg && <div className="mt-3 text-sm text-slate-600">{msg}</div>}
      </Card>

      {loading && <Spinner label="Loading participants…" />}

      {/* By role */}
      {ROLES.map((r) => {
        const list = wallets.filter((w) => w.role === r);
        if (list.length === 0) return null;
        return (
          <div key={r}>
            <div className="mb-2 flex items-center gap-2">
              <RoleBadge role={r} />
              <span className="text-xs text-slate-400">{list.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const studentKey = w.studentId || w.name;
                const allocationInfo = studentAllocations.get(studentKey) || studentAllocations.get(w.name);
                const allocatedCoins = allocationInfo?.totalAllocated ?? 0;

                return (
                  <Card key={w.address} className="p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-slate-800">{w.name}</div>
                          {w.institution && (
                            <div className="text-xs text-slate-400">{w.institution}</div>
                          )}
                        </div>
                        <span className="text-lg">
                          {r === "GOVERNMENT" ? "🏛️" : r === "INSTITUTION" ? "🎓" : r === "STUDENT" ? "🧑‍🎓" : "🏪"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Mined Wallet Balance:</span>
                        {r !== "GOVERNMENT" && (
                          <span className="text-sm font-bold font-mono">
                            <EDU amount={balanceMap.get(w.address) ?? 0} />
                          </span>
                        )}
                      </div>

                      {/* Display Allocated Scholarship if any (Requirement 10) */}
                      {r === "STUDENT" && allocatedCoins > 0 && (
                        <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/70 p-2 text-xs">
                          <div className="flex items-center justify-between font-semibold text-indigo-900">
                            <span>Allocated Scholarship:</span>
                            <span className="font-mono text-indigo-700">+{allocatedCoins} EDU</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-indigo-600">
                            <span>Records: {allocationInfo?.records.join(", ")}</span>
                            <span className="rounded bg-indigo-200/70 px-1 py-0.2 font-medium">NOT LINKED</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 border-t border-slate-100 pt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <Hash value={w.address} chars={6} />
                      {enabled("signatures") && w.publicKey && (
                        <div className="flex items-center gap-1">
                          <span>🔑 Ed25519</span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {!loading && wallets.length === 0 && <Empty>No participants registered yet.</Empty>}
    </div>
  );
}
