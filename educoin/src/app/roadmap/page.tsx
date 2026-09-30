"use client";

import { useStage } from "@/context/StageContext";
import { STAGE_META, type Stage } from "@/config/stage";
import { featuresIntroducedAt, FEATURE_LABELS } from "@/config/features";
import { Card, Badge, Button } from "@/components/ui";

const DELIVERABLES: Record<Stage, { objective: string; deliverables: string[]; demo: string }> = {
  1: {
    objective:
      "Establish the blockchain substrate — a tamper-evident, hash-linked ledger with proof-of-work and Merkle commitments. Fully generic; no currency yet.",
    deliverables: [
      "Block data structure with index, timestamp, transactions, nonce & SHA-256 hash",
      "Hash-linking of blocks via previousHash (the chain)",
      "Proof-of-work mining with adjustable difficulty",
      "Merkle root per block + inclusion proofs for any transaction",
      "Chain-integrity validation and an interactive Tamper Lab",
    ],
    demo: "Mine blocks, generate a Merkle proof, then use the Tamper Lab to break the chain and watch validation catch it.",
  },
  2: {
    objective:
      "Turn the ledger into a working digital currency: participants with cryptographic wallets, minting, and signed transfers between any wallets.",
    deliverables: [
      "Wallet registry with real Ed25519 key pairs (addresses derived from public keys)",
      "Minting of new coin and free transfers between any registered wallets",
      "Digitally-signed transactions; balances derived from confirmed blocks",
      "A general-purpose coin — no sector rules yet",
    ],
    demo: "Register wallets, mint coin, send it between any two wallets, mine it in, and show each wallet's key.",
  },
  3: {
    objective:
      "Make the currency STABLE: a ₹100-per-EDU INR-backed peg with a collateral reserve, plus the core policy engine enforcing the generic rules.",
    deliverables: [
      "Stablecoin peg (1 EDU = ₹100) backed by a fully-collateralised INR reserve",
      "Minting blocked whenever it would break the peg",
      "Core policy engine: registered participants, balance, positive amount, valid signature",
      "Contract Viewer + live Policy Simulator",
    ],
    demo: "Fund the reserve, show the collateral ratio, then try to over-mint and watch the peg protection reject it.",
  },
  4: {
    objective:
      "Deliver transparency and operations for the stablecoin: tracing, analytics, audit trail, redemption back to INR, and the admin console.",
    deliverables: [
      "End-to-end fund tracing across any wallet",
      "Analytics dashboards, transaction search & tamper-evident audit trail",
      "Settlement / redemption of EduCoin back to INR",
      "Admin console, reports, notifications & persona switcher",
    ],
    demo: "Trace a wallet's funds, redeem an institution's EduCoin for INR, search the ledger, and generate a report.",
  },
  5: {
    objective:
      "Apply the stable currency to the SECTOR-SPECIFIC REQUIREMENT — education. The purpose-bound scholarship layer is introduced here, and only here.",
    deliverables: [
      "Roles enforced: Government issues to Students; Students spend only to Institutions / Vendors",
      "Approved educational categories (tuition, exam, hostel, books) with per-category caps",
      "Time-bound scholarships with expiry + Government clawback of lapsed funds",
      "Sector rules R2–R5, R8, R9 layered onto the generic engine; education fraud alerts & whitepaper",
    ],
    demo: "Attempt a student-to-student cash-out, a wrong-category payment, a cap breach and an expired spend — all now rejected with reasons.",
  },
};

export default function RoadmapPage() {
  const { stage, setStage } = useStage();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Project Roadmap</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          The project is delivered in five monthly stages. Each stage builds on the last and is
          fully demonstrable on its own — raising the stage progressively unlocks features without
          removing any earlier code. You are currently viewing{" "}
          <span className="font-semibold" style={{ color: STAGE_META[stage].color }}>
            Stage {stage} — {STAGE_META[stage].title}
          </span>
          .
        </p>
      </div>

      <div className="space-y-4">
        {([1, 2, 3, 4, 5] as Stage[]).map((s) => {
          const meta = STAGE_META[s];
          const state = s < stage ? "done" : s === stage ? "current" : "upcoming";
          const info = DELIVERABLES[s];
          return (
            <Card
              key={s}
              className={`overflow-hidden ${state === "current" ? "ring-2" : ""}`}
              style={
                state === "current"
                  ? ({ ["--tw-ring-color"]: meta.color } as React.CSSProperties)
                  : undefined
              }
            >
              <div className="flex flex-col gap-4 p-6 sm:flex-row">
                <div className="sm:w-48 sm:shrink-0">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold text-white shadow"
                    style={{ background: meta.color }}
                  >
                    {s}
                  </div>
                  <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {meta.month}
                  </div>
                  <div className="text-base font-semibold text-slate-800">{meta.title}</div>
                  <div className="mt-2">
                    {state === "done" && <Badge color="green">✅ Completed</Badge>}
                    {state === "current" && <Badge color="blue">▶️ Now showing</Badge>}
                    {state === "upcoming" && <Badge color="slate">🔒 Upcoming</Badge>}
                  </div>
                  {state !== "current" && (
                    <Button
                      variant="ghost"
                      className="mt-3 px-2 py-1 text-xs"
                      onClick={() => setStage(s)}
                    >
                      Preview this stage →
                    </Button>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-slate-600">{info.objective}</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Deliverables
                      </div>
                      <ul className="space-y-1 text-sm text-slate-600">
                        {info.deliverables.map((d, i) => (
                          <li key={i} className="flex gap-2">
                            <span style={{ color: meta.color }}>▹</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Features unlocked
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {featuresIntroducedAt(s).map((f) => (
                          <span key={f} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                            {FEATURE_LABELS[f]}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-500">
                        <span className="font-semibold text-slate-600">Viva demo:</span> {info.demo}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
