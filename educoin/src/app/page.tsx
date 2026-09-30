"use client";

import Link from "next/link";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { STAGE_META, FEATURE_STAGE, type Stage } from "@/config/stage";
import { featuresIntroducedAt, FEATURE_LABELS } from "@/config/features";
import { Card, Stat, Button, Badge } from "@/components/ui";
import { NAV } from "@/components/nav";

export default function HomePage() {
  const { stage } = useStage();
  const { data } = useChainData();
  const meta = STAGE_META[stage];

  const quickLinks = NAV.filter(
    (n) => n.href !== "/" && n.href !== "/about" && (!n.feature || true)
  );

  return (
    <div className="space-y-8">
      {/* Hero */}
      <Card className="grid-bg relative overflow-hidden p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge color="blue">B.Tech Major Project · Team 6</Badge>
            <Badge color="slate">Blockchain</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            EduCoin — a <span className="text-brand-600">stable</span> cryptocurrency,
            reserve-backed &amp; smart-contract governed.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            Existing cryptocurrencies like Bitcoin and Ethereum are too volatile for everyday use.
            EduCoin is a blockchain-based stablecoin pegged 1:1 to the rupee and fully backed by an
            INR reserve, with secure minting, an immutable ledger and redemption to fiat — then
            specialized for a <b>sector-specific requirement</b> (education) via smart-contract rules.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/explorer">
              <Button>🔗 Explore the chain</Button>
            </Link>
            <Link href="/roadmap">
              <Button variant="outline">🗺️ 5-stage roadmap</Button>
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 hidden h-64 w-64 rounded-full opacity-20 blur-2xl md:block"
          style={{ background: meta.color }} />
      </Card>

      {/* Current stage strip */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Demonstration progress
          </h2>
          <span className="text-xs text-slate-400">One milestone per month</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          {([1, 2, 3, 4, 5] as Stage[]).map((s) => {
            const sm = STAGE_META[s];
            const state = s < stage ? "done" : s === stage ? "current" : "upcoming";
            return (
              <div
                key={s}
                className={`rounded-xl border p-3 transition ${
                  state === "current"
                    ? "border-transparent text-white shadow"
                    : state === "done"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
                style={state === "current" ? { background: sm.color } : undefined}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${state === "current" ? "text-white/90" : "text-slate-400"}`}>
                    {sm.month}
                  </span>
                  <span className="text-sm">
                    {state === "done" ? "✅" : state === "current" ? "▶️" : "🔒"}
                  </span>
                </div>
                <div className={`mt-1 text-sm font-semibold leading-tight ${state === "current" ? "text-white" : "text-slate-700"}`}>
                  {sm.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Block height" value={data?.meta.height ?? "—"} accent={meta.color} hint="blocks mined" />
        <Stat
          label="Participants"
          value={stage >= 2 ? data?.meta.walletCount ?? "—" : "🔒"}
          hint="registered wallets"
        />
        <Stat
          label="EduCoin issued"
          value={stage >= 2 ? (data ? data.meta.totalIssued.toLocaleString() : "—") : "🔒"}
          accent="#10b981"
          hint="scholarship minted"
        />
        <Stat
          label="Chain integrity"
          value={data ? (data.integrity.valid ? "✔ Valid" : "✗ Broken") : "—"}
          accent={data?.integrity.valid ? "#10b981" : "#e11d48"}
          hint={`${data?.integrity.blocksChecked ?? 0} blocks verified`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* What's live now */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-base font-semibold text-slate-800">
            What's live in {meta.month} — {meta.title}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{meta.tagline}</p>
          <div className="mt-4 space-y-4">
            {([1, 2, 3, 4, 5] as Stage[])
              .filter((s) => s <= stage)
              .map((s) => (
                <div key={s} className="flex gap-3">
                  <div
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: STAGE_META[s].color }}
                  >
                    {s}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-700">
                      {STAGE_META[s].title}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-1.5">
                      {featuresIntroducedAt(s).map((f) => (
                        <span
                          key={f}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500"
                        >
                          {FEATURE_LABELS[f]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* Quick links */}
        <Card className="p-6">
          <h3 className="text-base font-semibold text-slate-800">Jump to</h3>
          <div className="mt-3 space-y-1.5">
            {quickLinks.map((l) => {
              const locked = l.feature ? stage < FEATURE_STAGE[l.feature] : false;
              return (
                <Link
                  key={l.href}
                  href={locked ? "#" : l.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                    locked
                      ? "cursor-not-allowed text-slate-300"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{l.icon}</span>
                  <span className="flex-1">{l.label}</span>
                  {locked && <span className="text-[10px]">🔒</span>}
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
