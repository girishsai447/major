"use client";

import { useMemo, useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { LockedPage } from "@/components/LockedPage";
import { Card, SectionTitle, EDU, Badge, Hash, CategoryBadge, Empty } from "@/components/ui";
import type { GenerationRecord, BurnRecord } from "@/lib/types";

export default function TracePage() {
  const { enabled } = useStage();
  const { data } = useChainData();

  // Mode: "COIN" (Serialized Banknote Provenance) vs "GENERATION" (Supervisor spec) vs "WALLET" (Legacy)
  const [traceMode, setTraceMode] = useState<"COIN" | "GENERATION" | "WALLET">("COIN");
  const [selectedGenId, setSelectedGenId] = useState<string>("");
  const [selectedCoinId, setSelectedCoinId] = useState<string>("");
  const [student, setStudent] = useState("");

  if (!enabled("traceability")) return <LockedPage feature="traceability" />;

  const generations: GenerationRecord[] = data?.generationRecords ?? [];
  const burnRecords: BurnRecord[] = data?.burnRecords ?? [];
  const coins: import("@/lib/types").EduCoinUnit[] = (data?.coins as import("@/lib/types").EduCoinUnit[]) ?? [];
  const students = (data?.wallets ?? []).filter((w) => w.role === "STUDENT");
  const allTx = (data?.chain ?? []).flatMap((b) => b.transactions);

  const activeCoin = coins.find((c) => c.coinId === selectedCoinId) || coins[0];

  // Default to first generation if none selected
  const activeGenId = selectedGenId || generations[0]?.generationId || "";
  const selectedGen = generations.find((g) => g.generationId === activeGenId);
  const matchingBurn = burnRecords.find((b) => b.generationId === activeGenId);
  const matchingMintingBlock = (data?.mintingBlocks ?? []).find((b) => b.blockId === selectedGen?.blockId);

  // Wallet mode variables
  const issued = allTx.filter((t) => t.type === "MINT" && t.to === student);
  const spent = allTx.filter((t) => t.type === "TRANSFER" && t.from === student);
  const totalIssued = issued.reduce((s, t) => s + t.amount, 0);
  const totalSpent = spent.reduce((s, t) => s + t.amount, 0);
  const remaining = totalIssued - totalSpent;
  const pct = totalIssued > 0 ? Math.round((totalSpent / totalIssued) * 100) : 0;
  const selectedStudentWallet = students.find((s) => s.address === student);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionTitle
          icon="🧭"
          title="Complete Scholarship Traceability"
          subtitle="End-to-end cryptographic tracing from Government reserve backing to puzzle blocks, nonce solutions, allocations, and expiry burn INR returns."
        />
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setTraceMode("COIN")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              traceMode === "COIN"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            💎 Trace by Individual Coin ID (Banknote Provenance)
          </button>
          <button
            onClick={() => setTraceMode("GENERATION")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              traceMode === "GENERATION"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🔍 Trace by Generation ID
          </button>
          <button
            onClick={() => setTraceMode("WALLET")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              traceMode === "WALLET"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            👛 Trace Student Wallet Spends
          </button>
        </div>
      </div>

      {traceMode === "COIN" ? (
        <div className="space-y-6">
          {/* Selector Card */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500">
                  Select Individual Coin Serial to Trace
                </label>
                <select
                  value={activeCoin?.coinId || ""}
                  onChange={(e) => setSelectedCoinId(e.target.value)}
                  className="mt-1 min-w-[320px] rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold font-mono text-slate-800 outline-none focus:border-brand-500 bg-white"
                >
                  {coins.map((c) => (
                    <option key={c.coinId} value={c.coinId}>
                      {c.displaySerial} (Coin #{c.serialNumber}) — ₹{c.denomination} ({c.status}) · Held by {c.currentOwnerName || c.currentOwner.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>

              {activeCoin && (
                <div className="flex items-center gap-2">
                  <Badge color={activeCoin.status === "ACTIVE" ? "green" : activeCoin.status === "REDEEMED" ? "amber" : "red"}>
                    Status: {activeCoin.status}
                  </Badge>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                    ₹{activeCoin.denomination} INR (1 EDU)
                  </span>
                </div>
              )}
            </div>
          </Card>

          {activeCoin && (
            <div className="space-y-6">
              {/* Coin Details Card */}
              <div className="grid gap-3 sm:grid-cols-4">
                <Card className="p-4">
                  <div className="text-xs uppercase text-slate-400 font-medium">Serial & Number</div>
                  <div className="mt-1 text-base font-bold font-mono text-slate-800">
                    {activeCoin.displaySerial}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Batch #{activeCoin.batchId} · Unit #{activeCoin.serialNumber}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs uppercase text-slate-400 font-medium">Fixed Denomination</div>
                  <div className="mt-1 text-base font-bold text-emerald-600">
                    ₹{activeCoin.denomination} INR
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">1 EduCoin Pegged</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs uppercase text-slate-400 font-medium">Current Holder</div>
                  <div className="mt-1 text-base font-bold text-slate-800 truncate">
                    {activeCoin.currentOwnerName || activeCoin.currentOwner.slice(0, 10)}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                    {activeCoin.currentOwner}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs uppercase text-slate-400 font-medium">Mint Integrity</div>
                  <div className="mt-1 text-sm font-bold text-indigo-600 flex items-center gap-1">
                    <span>✓</span> Verified Issuer
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                    Treasury Ed25519 Sig
                  </div>
                </Card>
              </div>

              {/* Cryptographic Preimage Hash Card */}
              <Card className="p-4 font-mono text-xs bg-slate-50 border-slate-200">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Cryptographic Coin Identifier (Tamper-Proof SHA-256 Digest):
                </div>
                <div className="break-all rounded-lg bg-white p-2.5 text-indigo-700 border border-slate-200 text-[11px]">
                  {activeCoin.coinId}
                </div>
              </Card>

              {/* Visual 4-Stage Lifecycle Stepper */}
              <Card className="p-6">
                <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span>🗺️</span> Complete Coin Lifecycle: Mint → Student → Institution → Bank → INR
                </h3>

                <div className="relative border-l-2 border-indigo-200 ml-4 space-y-6 pb-2">
                  {/* Step 1: Genesis Mint */}
                  <div className="relative pl-6">
                    <span className="absolute -left-2.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                      1
                    </span>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-800 text-xs">
                          🏛️ Authorized Genesis Mint (Government Treasury)
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(activeCoin.mintedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        Minted in Batch #{activeCoin.batchId} with fixed value ₹{activeCoin.denomination} INR. Fully collateralised by the Government Reserve.
                      </p>
                      <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                        Issuer: {activeCoin.issuer}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Student Allocation */}
                  <div className="relative pl-6">
                    <span className="absolute -left-2.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      2
                    </span>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-800 text-xs">
                          🎓 Scholarship Allocation to Student Beneficiary
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {activeCoin.history[1] ? new Date(activeCoin.history[1].timestamp).toLocaleString() : "Allocated"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        Transferred to {activeCoin.history[1]?.toName || "Student Wallet"} under designated educational purpose. Serial #{activeCoin.serialNumber} bound to student identity.
                      </p>
                      {activeCoin.history[1]?.txId && (
                        <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                          Tx: {activeCoin.history[1].txId}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Institution Spend */}
                  {activeCoin.history.some((h) => h.category === "TUITION" || h.category === "HOSTEL" || h.category === "BOOKS") ? (
                    <div className="relative pl-6">
                      <span className="absolute -left-2.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                        3
                      </span>
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-slate-800 text-xs">
                            🏫 Institution Payment Verification (VNR VJIET / Book Store)
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            Confirmed on Blockchain
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Paid toward educational fees. The institution checked the 7 verification rules and accepted the coin identity on-chain.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                          <Badge color="green">Category Verified</Badge>
                          <Badge color="blue">Non-Counterfeit</Badge>
                          <Badge color="violet">Ownership Transferred</Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative pl-6 opacity-60">
                      <span className="absolute -left-2.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-slate-600 text-[10px] font-bold">
                        3
                      </span>
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                        <strong>Held in Student Wallet:</strong> Coin is currently active and unspent. Ready to be spent on approved fees at enrolled college.
                      </div>
                    </div>
                  )}

                  {/* Step 4: Bank Settlement */}
                  {activeCoin.status === "REDEEMED" ? (
                    <div className="relative pl-6">
                      <span className="absolute -left-2.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white text-[10px] font-bold">
                        4
                      </span>
                      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            🏦 Bank Settlement & Real Fiat INR Disbursement
                          </span>
                          <Badge color="amber">REDEEMED</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Institution redeemed this coin with the partner bank. The coin was verified, burned/locked on-chain, and ₹100 INR was released directly from the Government Reserve to the institution’s bank account.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative pl-6 opacity-60">
                      <span className="absolute -left-2.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-slate-600 text-[10px] font-bold">
                        4
                      </span>
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                        <strong>Pending Bank Settlement:</strong> Will be redeemed by receiving college/vendor for fiat INR at term end.
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      ) : traceMode === "GENERATION" ? (
        <div className="space-y-6">
          {/* Selector Card */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500">
                  Select Generation Event to Trace
                </label>
                <select
                  value={activeGenId}
                  onChange={(e) => setSelectedGenId(e.target.value)}
                  className="mt-1 min-w-[280px] rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500"
                >
                  {generations.map((g) => (
                    <option key={g.generationId} value={g.generationId}>
                      {g.generationId} — {g.studentName} ({g.coinsDisplay} EDU · {g.status})
                    </option>
                  ))}
                </select>
              </div>

              {selectedGen && (
                <div className="flex items-center gap-2">
                  <Badge color={selectedGen.status === "BURNED" ? "red" : "green"}>
                    Status: {selectedGen.status}
                  </Badge>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-600">
                    Wallet: {selectedGen.walletStatus}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {selectedGen ? (
            <Card className="p-6 space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-800">
                  Cryptographic Trace Pipeline: {selectedGen.generationId}
                </h3>
                <p className="text-xs text-slate-500">
                  Supervisor traceability flow: Generation → Student → Reserve → Minting Block → Puzzle →
                  Nonce → Hash → Coins Generated → Expiry → Burn / INR Return.
                </p>
              </div>

              {/* Step-by-Step Interactive Pipeline Flow */}
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-100">
                {/* 1. Generation ID & Student */}
                <div className="relative flex items-start gap-4">
                  <span className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-4 ring-white">
                    1
                  </span>
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 w-full">
                    <div className="font-semibold text-indigo-950 text-sm flex items-center justify-between">
                      <span>Government Generation Event: {selectedGen.generationId}</span>
                      <span className="text-xs font-mono text-slate-500">
                        {new Date(selectedGen.generationTimestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-700">
                      <div>
                        <span className="text-slate-400">Student:</span> {selectedGen.studentName}
                      </div>
                      <div>
                        <span className="text-slate-400">Student ID:</span> {selectedGen.studentId}
                      </div>
                      <div>
                        <span className="text-slate-400">Institute:</span> {selectedGen.instituteName}
                      </div>
                      <div>
                        <span className="text-slate-400">Academic Level:</span> {selectedGen.academicLevel}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Reserve Backing Check */}
                <div className="relative flex items-start gap-4">
                  <span className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white ring-4 ring-white">
                    2
                  </span>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 w-full">
                    <div className="font-semibold text-emerald-950 text-sm">
                      Reserve Backing Verification (1 EDU = ₹100 INR)
                    </div>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700">
                      <div>
                        <span className="text-slate-400">Coins Generated:</span>{" "}
                        <span className="font-bold text-emerald-700 font-mono">
                          {selectedGen.coinsDisplay} EDU
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Total INR Required:</span>{" "}
                        <span className="font-bold text-emerald-700 font-mono">
                          ₹{selectedGen.totalValue.toLocaleString()} INR
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Invariant Status:</span>{" "}
                        <span className="text-emerald-600 font-medium">✓ 100% Reserve Backed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Minting Block & Puzzle Solving */}
                <div className="relative flex items-start gap-4">
                  <span className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white ring-4 ring-white">
                    3
                  </span>
                  <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 w-full font-mono text-xs">
                    <div className="font-semibold text-purple-950 text-sm flex items-center justify-between font-sans">
                      <span>Minting Block: {selectedGen.blockId}</span>
                      <span className="text-purple-600 text-xs">Solved via Nonce Search</span>
                    </div>
                    <div className="mt-2 space-y-1.5 text-purple-900">
                      <div>
                        <span className="text-slate-400">Winning Nonce:</span>{" "}
                        <span className="font-bold text-purple-700">{selectedGen.nonce}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Block Puzzle Hash:</span>{" "}
                        <Hash value={selectedGen.hash} chars={16} />
                      </div>
                      {matchingMintingBlock && (
                        <div>
                          <span className="text-slate-400">Previous Block Hash:</span>{" "}
                          <Hash value={matchingMintingBlock.previousBlockHash} chars={16} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Expiry Constraints */}
                <div className="relative flex items-start gap-4">
                  <span className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white ring-4 ring-white">
                    4
                  </span>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 w-full">
                    <div className="font-semibold text-amber-950 text-sm">
                      Individualized Academic Expiries
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                      <div>
                        <span className="text-slate-400">Student Coin Expiry:</span>{" "}
                        <span className="font-bold text-amber-800">
                          {new Date(selectedGen.studentExpiry).toLocaleDateString()}
                        </span>{" "}
                        (Academic Completion Date)
                      </div>
                      <div>
                        <span className="text-slate-400">Institute Usage Expiry:</span>{" "}
                        <span className="font-bold text-amber-800">
                          {new Date(selectedGen.instituteExpiry).toLocaleDateString()}
                        </span>{" "}
                        (+6 Months Extension)
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Wallet Decoupling & Future Integration */}
                <div className="relative flex items-start gap-4">
                  <span className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-[10px] font-bold text-white ring-4 ring-white">
                    5
                  </span>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 w-full text-xs text-slate-700">
                    <div className="font-semibold text-slate-900 text-sm flex items-center justify-between">
                      <span>Allocation State & Future Wallet Extension</span>
                      <Badge color="slate">{selectedGen.walletStatus}</Badge>
                    </div>
                    <p className="mt-1 text-slate-500">
                      In this milestone phase, coins are held as an official allocation record. When the
                      wallet team connects the student address, this record will map to the student's on-chain
                      account without re-minting.
                    </p>
                  </div>
                </div>

                {/* 6. Burn & Reserve Credit (if applicable) */}
                {selectedGen.status === "BURNED" && matchingBurn ? (
                  <div className="relative flex items-start gap-4">
                    <span className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-4 ring-white">
                      6
                    </span>
                    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 w-full">
                      <div className="font-semibold text-rose-950 text-sm flex items-center justify-between">
                        <span>Expiry Burn Event: {matchingBurn.burnId}</span>
                        <Badge color="red">COINS BURNED</Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700 font-mono">
                        <div>
                          <span className="text-slate-400 font-sans">Coins Burned:</span>{" "}
                          <span className="font-bold text-rose-700">
                            {matchingBurn.coinsBurnedDisplay} EDU
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-sans">INR Returned to Reserve:</span>{" "}
                          <span className="font-bold text-emerald-700">
                            +₹{matchingBurn.inrReturned.toLocaleString()} INR
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-sans">Reserve Restored:</span>{" "}
                          <span>₹{matchingBurn.reserveAfter.toLocaleString()} INR</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex items-start gap-4">
                    <span className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white ring-4 ring-white">
                      ✓
                    </span>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3 text-xs text-emerald-800">
                      Coins actively allocated and backing intact. Once expiry date passes, the Government can
                      trigger the automated burn and INR redemption cycle.
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Empty>No generation record selected.</Empty>
          )}
        </div>
      ) : (
        /* Legacy Student Wallet Spends Trace */
        <div className="space-y-6">
          <Card className="p-4">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Select a student wallet to trace educational spends
            </label>
            <select
              value={student}
              onChange={(e) => setStudent(e.target.value)}
              className="w-full max-w-md rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            >
              <option value="">Choose a student wallet…</option>
              {students.map((s) => (
                <option key={s.address} value={s.address}>
                  {s.name} {s.institution ? `· ${s.institution}` : ""}
                </option>
              ))}
            </select>
          </Card>

          {!student ? (
            <Empty>Select a student wallet above to view educational spending traces.</Empty>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card className="p-4">
                  <div className="text-xs uppercase text-slate-400">Total Issued</div>
                  <div className="mt-1 text-xl font-bold text-emerald-600">
                    {totalIssued.toLocaleString()} EDU
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs uppercase text-slate-400">Utilized</div>
                  <div className="mt-1 text-xl font-bold text-amber-600">
                    {totalSpent.toLocaleString()} EDU
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs uppercase text-slate-400">Remaining Balance</div>
                  <div className="mt-1 text-xl font-bold text-indigo-600">
                    {remaining.toLocaleString()} EDU
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs uppercase text-slate-400">Utilization Rate</div>
                  <div className="mt-1 text-xl font-bold text-slate-700">{pct}%</div>
                </Card>
              </div>

              <Card className="p-5">
                <div className="mb-4 text-sm font-semibold text-slate-800">
                  Educational Spending Breakdown for {selectedStudentWallet?.name}
                </div>
                <div className="space-y-3">
                  {spent.length === 0 ? (
                    <div className="text-xs text-slate-400 py-4 text-center">
                      No educational spending transactions yet for this student wallet.
                    </div>
                  ) : (
                    spent.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <CategoryBadge category={tx.category} />
                          <span className="font-medium text-slate-700">{tx.memo || "Educational Fee"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-amber-600 font-mono">{tx.amount} EDU</span>
                          <span className="text-slate-400">
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
