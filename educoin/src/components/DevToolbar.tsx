"use client";

import { useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { STAGE_META, type Stage } from "@/config/stage";
import { api } from "@/lib/api";

/**
 * Floating developer control — the runtime Stage Selector.
 *
 * The canonical way to switch stages is editing CURRENT_STAGE in
 * src/config/stage.ts. This toolbar mirrors that at runtime for convenience
 * during a live demo (and forwards the stage to the API via cookie so the
 * smart-contract enforcement matches what's on screen).
 */
export function DevToolbar() {
  const { stage, setStage, demoMode, toggleDemo, resetToCode, overridden } = useStage();
  const { refresh } = useChainData();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const changeStage = async (s: Stage) => {
    setStage(s);
    // allow the cookie to update, then refetch stage-dependent data
    setTimeout(() => refresh(), 30);
  };

  const resetData = async (seed: boolean) => {
    setBusy(true);
    try {
      await api.reset(seed);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 print:hidden">
      {open && (
        <div className="mb-2 w-72 animate-fade-in rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">Stage Selector</div>
            <button
              onClick={resetToCode}
              className="text-[11px] text-slate-400 hover:text-slate-600"
              title="Revert to CURRENT_STAGE in code"
            >
              reset to code
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {([1, 2, 3, 4, 5] as Stage[]).map((s) => (
              <button
                key={s}
                onClick={() => changeStage(s)}
                className={`rounded-lg py-2 text-sm font-semibold transition ${
                  stage === s
                    ? "text-white shadow"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
                style={stage === s ? { background: STAGE_META[s].color } : undefined}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-2 rounded-lg bg-slate-50 p-2 text-[11px] leading-snug text-slate-500">
            <span className="font-semibold text-slate-700">{STAGE_META[stage].month}:</span>{" "}
            {STAGE_META[stage].title}
            {overridden && (
              <span className="mt-1 block text-amber-600">
                ⚠ runtime override (code says Stage set in stage.ts)
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <span className="text-xs font-medium text-slate-600">🎬 Demo Mode</span>
            <button
              onClick={toggleDemo}
              className={`relative h-5 w-9 rounded-full transition ${
                demoMode ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                  demoMode ? "left-[18px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <button
              disabled={busy}
              onClick={() => resetData(true)}
              className="rounded-lg bg-brand-600 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Re-seed demo
            </button>
            <button
              disabled={busy}
              onClick={() => resetData(false)}
              className="rounded-lg bg-slate-100 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50"
            >
              Empty chain
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl transition hover:scale-105"
        title="Stage Selector & Demo controls"
        style={{ boxShadow: `0 0 0 3px ${STAGE_META[stage].color}55` }}
      >
        <span className="text-sm font-bold">S{stage}</span>
      </button>
    </div>
  );
}
