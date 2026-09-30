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
        title="Participants"
        subtitle="Every actor on the EduCoin network holds a wallet with a role. Roles determine what each participant is allowed to do under the smart contract."
      />

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
              {list.map((w) => (
                <Card key={w.address} className="p-4">
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
                    <Hash value={w.address} chars={6} />
                    {r !== "GOVERNMENT" && (
                      <span className="text-sm">
                        <EDU amount={balanceMap.get(w.address) ?? 0} />
                      </span>
                    )}
                  </div>
                  {enabled("signatures") && w.publicKey && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                      🔑 <span>Ed25519 key</span>
                      <Hash value={w.publicKey} chars={6} />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {!loading && wallets.length === 0 && <Empty>No participants registered yet.</Empty>}
    </div>
  );
}
