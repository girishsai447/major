"use client";

import { useState } from "react";
import { useStage } from "@/context/StageContext";
import { STAGE_META, type Stage } from "@/config/stage";

/** Presenter talking points per stage — shown only in Demo Mode. */
const SCRIPT: Record<Stage, { title: string; points: string[] }> = {
  1: {
    title: "Demonstrate the blockchain foundation",
    points: [
      "Open Block Explorer — show the hash-linked chain and each block's Merkle root.",
      "In the Blockchain Lab, generate a Merkle proof for a transaction.",
      "Use the Tamper Lab to alter a block, then re-validate — tampering is caught.",
      "Explain proof-of-work: the nonce that produced the leading zeros.",
    ],
  },
  2: {
    title: "A working digital currency",
    points: [
      "Show Participants — each wallet has a real Ed25519 key pair.",
      "Mint coin to a wallet and mine it in; the balance appears.",
      "Transfer coin between any two wallets — no sector rules yet.",
      "Point out: this is a general-purpose coin at this stage.",
    ],
  },
  3: {
    title: "Make it a stablecoin",
    points: [
      "Open Reserve & Peg — show 1 EDU = ₹100 and the collateral ratio.",
      "Try minting beyond the reserve → blocked to protect the peg.",
      "Open Smart Contract — read the 4 generic rules (balance, amount, participants, signature).",
      "Policy Simulator: try an overspend → REJECTED.",
    ],
  },
  4: {
    title: "Trace, settle & operate",
    points: [
      "Fund Tracing — pick a wallet, follow issuance → utilization.",
      "Settlements — redeem an institution's EduCoin back to INR.",
      "Admin Console — search the full ledger; generate a Report.",
    ],
  },
  5: {
    title: "The sector-specific requirement — Education",
    points: [
      "Smart Contract now shows the 6 extra education rules (R2–R5, R8, R9).",
      "Policy Simulator: student-to-student cash-out → REJECTED.",
      "Try a wrong-category payment and a cap breach → REJECTED.",
      "Recap: the stable coin is now purpose-bound to education.",
    ],
  },
};

export function DemoOverlay() {
  const { demoMode, stage, toggleDemo } = useStage();
  const [notesOpen, setNotesOpen] = useState(false);
  if (!demoMode) return null;

  const meta = STAGE_META[stage];
  const script = SCRIPT[stage];

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-1.5 text-xs font-medium text-white print:hidden"
        style={{ background: `linear-gradient(90deg, ${meta.color}, #0f172a)` }}
      >
        <span className="animate-pulse-ring inline-flex h-2 w-2 rounded-full bg-white" />
        <span className="font-semibold uppercase tracking-wide">Demo Mode</span>
        <span className="opacity-90">
          {meta.month} · {meta.title}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={() => setNotesOpen((o) => !o)} className="underline-offset-2 hover:underline">
            {notesOpen ? "Hide" : "Presenter notes"}
          </button>
          <button onClick={toggleDemo} className="opacity-80 hover:opacity-100" title="Exit demo mode">
            ✕
          </button>
        </div>
      </div>

      {notesOpen && (
        <div className="fixed bottom-20 right-4 z-40 w-80 animate-fade-in rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl print:hidden">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: meta.color }}>
            {meta.month} — Presenter script
          </div>
          <div className="mb-2 text-sm font-semibold text-slate-800">{script.title}</div>
          <ol className="space-y-1.5 text-sm text-slate-600">
            {script.points.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: meta.color }}
                >
                  {i + 1}
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}
