"use client";

import { useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { api } from "@/lib/api";
import { LockedPage } from "@/components/LockedPage";
import { Card, SectionTitle, Button, Stat, Hash, Badge, Empty } from "@/components/ui";
import type { GenerationRecord, BurnRecord, AuditRecord } from "@/lib/types";

export default function AuditPage() {
  const { enabled } = useStage();
  const { data, refresh } = useChainData();

  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    totalRecords: number;
    reason?: string;
  } | null>(null);
  const [burningId, setBurningId] = useState<string | null>(null);
  const [burnFeedback, setBurnFeedback] = useState<string | null>(null);
  const [selectedAuditRecord, setSelectedAuditRecord] = useState<AuditRecord | null>(null);
  const [decryptedAuditPayload, setDecryptedAuditPayload] = useState<Record<string, unknown> | null>(null);

  // Demo clock fast-forward states
  const [fastForwarding, setFastForwarding] = useState(false);

  if (!enabled("auditTrail")) return <LockedPage feature="auditTrail" />;

  const gov = data?.govMetrics;
  const auditLedger = data?.auditLedger ?? [];
  const generationRecords = data?.generationRecords ?? [];
  const burnRecords = data?.burnRecords ?? [];
  const effectiveTime = data?.effectiveTime ?? Date.now();

  // Find expired generation records pending burn
  const pendingBurnRecords = generationRecords.filter((g) => {
    if (g.status === "BURNED") return false;
    return effectiveTime > g.studentExpiry || effectiveTime > g.instituteExpiry;
  });

  // Verify hash-chain integrity
  const handleVerifyLedger = async () => {
    setVerifying(true);
    try {
      const res = await api.verifyAudit();
      setVerificationResult(res);
    } catch (err: unknown) {
      setVerificationResult({
        valid: false,
        totalRecords: auditLedger.length,
        reason: err instanceof Error ? err.message : "Verification error",
      });
    } finally {
      setVerifying(false);
    }
  };

  // Execute Expiry Burn and return INR to reserve
  const handleExecuteBurn = async (generationId: string) => {
    setBurningId(generationId);
    setBurnFeedback(null);
    try {
      const res = await api.burn(generationId);
      if (res.success && res.burnRecord) {
        setBurnFeedback(
          `✅ Successfully burned ${res.burnRecord.coinsBurnedDisplay} EDU from ${generationId}! Credited ₹${res.burnRecord.inrReturned.toLocaleString()} INR back to reserve.`
        );
        await refresh();
      } else {
        setBurnFeedback(`❌ Burn failed: ${res.error}`);
      }
    } catch (err: unknown) {
      setBurnFeedback(`❌ Burn failed: ${err instanceof Error ? err.message : "Error"}`);
    } finally {
      setBurningId(null);
    }
  };

  // Demo Clock Quick Controls
  const handleFastForward = async (days: number) => {
    setFastForwarding(true);
    try {
      await api.setDemoClock({ offsetDays: days });
      await refresh();
    } finally {
      setFastForwarding(false);
    }
  };

  const handleResetClock = async () => {
    setFastForwarding(true);
    try {
      await api.setDemoClock({ reset: true });
      await refresh();
    } finally {
      setFastForwarding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionTitle
          icon="🛡️"
          title="Government Audit Ledger & Reserve Dashboard"
          subtitle="Cryptographically hash-chained, tamper-evident audit ledger. Tracks coin generation, reserve backing, student/institute expiries, atomic coin burns, and INR return."
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleVerifyLedger}
            disabled={verifying}
            className="text-xs"
          >
            {verifying ? "Checking Chain..." : "🔍 Verify Audit Chain Integrity"}
          </Button>
        </div>
      </div>

      {/* Demo Clock Alert / Fast-Forward Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs">
        <div className="flex items-center gap-2 text-indigo-900">
          <span className="text-base">⏱️</span>
          <div>
            <span className="font-semibold">Simulated Effective Time:</span>{" "}
            <span className="font-mono font-bold text-indigo-700">
              {new Date(effectiveTime).toLocaleDateString()} {new Date(effectiveTime).toLocaleTimeString()}
            </span>
            {data?.demoClockOffsetMs ? (
              <span className="ml-2 rounded bg-indigo-200 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800">
                FAST-FORWARDED
              </span>
            ) : (
              <span className="ml-2 rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                LIVE TIME
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Demo Controls:</span>
          <button
            onClick={() => handleFastForward(183)}
            disabled={fastForwarding}
            className="rounded bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-sm border border-indigo-200 hover:bg-indigo-100/50"
          >
            +6 Months
          </button>
          <button
            onClick={() => handleFastForward(365)}
            disabled={fastForwarding}
            className="rounded bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-sm border border-indigo-200 hover:bg-indigo-100/50"
          >
            +1 Year
          </button>
          <button
            onClick={() => handleFastForward(730)}
            disabled={fastForwarding}
            className="rounded bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-sm border border-indigo-200 hover:bg-indigo-100/50"
          >
            +2 Years
          </button>
          <button
            onClick={handleResetClock}
            disabled={fastForwarding}
            className="rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300"
          >
            Reset Clock
          </button>
        </div>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          className={`rounded-xl border p-4 text-xs font-medium ${
            verificationResult.valid
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">
              {verificationResult.valid
                ? `✓ Cryptographic Audit Chain Valid (${verificationResult.totalRecords} records verified)`
                : `✗ Tamper Alert: Hash Chain Verification Failed`}
            </span>
            <button
              onClick={() => setVerificationResult(null)}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          </div>
          {verificationResult.valid ? (
            <p className="mt-1 text-[11px] text-emerald-700">
              Every audit record is cryptographically linked to its predecessor via SHA-256 hash chaining.
              No modified, deleted, or inserted records detected.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-rose-700">
              Reason: {verificationResult.reason}
            </p>
          )}
        </div>
      )}

      {/* Supervisor Required Metrics Grid (Section 13 & 15) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat
          label="Total INR Reserve"
          value={`₹${(gov?.totalReserveINR ?? 0).toLocaleString()}`}
          accent="#10b981"
        />
        <Stat
          label="Max Reserve Coins"
          value={`${(gov?.maxReserveBackedCoins ?? 0).toLocaleString()} EDU`}
        />
        <Stat
          label="Total Coins Generated"
          value={`${(gov?.totalCoinsGenerated ?? 0).toLocaleString()} EDU`}
          accent="#6366f1"
        />
        <Stat
          label="Remaining Capacity"
          value={`${(gov?.remainingMintingCapacity ?? 0).toLocaleString()} EDU`}
          accent="#059669"
        />
        <Stat
          label="Number of Students"
          value={gov?.studentCount ?? 0}
        />
        <Stat
          label="Generation Events"
          value={gov?.generationCount ?? 0}
        />
        <Stat
          label="Total Coins Burned"
          value={`${(gov?.totalCoinsBurned ?? 0).toLocaleString()} EDU`}
          accent="#e11d48"
        />
        <Stat
          label="Circulating Coins"
          value={`${(gov?.circulatingCoins ?? 0).toLocaleString()} EDU`}
        />
        <Stat
          label="Total INR Returned"
          value={`₹${(gov?.totalInrReturned ?? 0).toLocaleString()}`}
          accent="#0d9488"
        />
        <Stat
          label="Pending Expiry Burn"
          value={pendingBurnRecords.length}
          accent={pendingBurnRecords.length > 0 ? "#f59e0b" : "#94a3b8"}
        />
      </div>

      {/* Expired Records Pending Burn Section (Section 15) */}
      <Card className="p-6 border-amber-200 bg-amber-50/20">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-200">
          <div>
            <h3 className="text-base font-semibold text-amber-900 flex items-center gap-2">
              <span>🔥</span> Expired Records Pending Government Burn Approval
            </h3>
            <p className="text-xs text-amber-800">
              Scholarships whose Student or Institute Expiry has elapsed. Burning permanently removes coins
              from circulation and credits the INR value (100 INR per coin) back to the reserve.
            </p>
          </div>
          <Badge color={pendingBurnRecords.length > 0 ? "amber" : "slate"}>
            {pendingBurnRecords.length} Eligible
          </Badge>
        </div>

        {burnFeedback && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 font-medium">
            {burnFeedback}
          </div>
        )}

        {pendingBurnRecords.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No expired coin generation records currently pending burn.
            <br />
            Tip: Use the Demo Controls above (+1 Year / +2 Years) to simulate the passage of time!
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-amber-100/50 text-[11px] font-semibold uppercase text-amber-900">
                <tr>
                  <th className="px-3 py-2">Generation ID</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Institute</th>
                  <th className="px-3 py-2">Expired Coins</th>
                  <th className="px-3 py-2">INR Return Value</th>
                  <th className="px-3 py-2">Student Expiry</th>
                  <th className="px-3 py-2">Institute Expiry</th>
                  <th className="px-3 py-2">Expiry Reason</th>
                  <th className="px-3 py-2 text-right">Government Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {pendingBurnRecords.map((rec) => {
                  const studentExpired = effectiveTime > rec.studentExpiry;
                  const instExpired = effectiveTime > rec.instituteExpiry;
                  const returnInr = rec.coinsDisplay * 100;
                  return (
                    <tr key={rec.generationId} className="hover:bg-amber-100/30">
                      <td className="px-3 py-2.5 font-bold font-mono text-amber-950">
                        {rec.generationId}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">
                        {rec.studentName} ({rec.studentId})
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{rec.instituteName}</td>
                      <td className="px-3 py-2.5 font-bold font-mono text-rose-700">
                        {rec.coinsDisplay} EDU
                      </td>
                      <td className="px-3 py-2.5 font-bold font-mono text-emerald-700">
                        ₹{returnInr.toLocaleString()} INR
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {new Date(rec.studentExpiry).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {new Date(rec.instituteExpiry).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                          {instExpired ? "INSTITUTE EXPIRED" : "STUDENT EXPIRED"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          onClick={() => handleExecuteBurn(rec.generationId)}
                          disabled={burningId === rec.generationId}
                          className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 py-1.5"
                        >
                          {burningId === rec.generationId ? "Burning..." : "🔥 Approve & Burn"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Burn History Table (Section 15) */}
      {burnRecords.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <span>🔥</span> Burn & INR Return History
              </h3>
              <p className="text-xs text-slate-500">
                Permanent records of burned expired coins and returned INR reserves.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {burnRecords.length} total burn records
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2">Burn ID</th>
                  <th className="px-3 py-2">Generation ID</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Expiry Type</th>
                  <th className="px-3 py-2">Coins Burned</th>
                  <th className="px-3 py-2">INR Returned</th>
                  <th className="px-3 py-2">Burn Timestamp</th>
                  <th className="px-3 py-2">Transaction Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {burnRecords.map((b) => (
                  <tr key={b.burnId} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 font-bold font-mono text-rose-800">{b.burnId}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-700">{b.generationId}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-700">
                      {b.studentName} ({b.studentId})
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge color={b.expiryType === "STUDENT" ? "amber" : "blue"}>
                        {b.expiryType}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 font-bold font-mono text-rose-700">
                      {b.coinsBurnedDisplay} EDU
                    </td>
                    <td className="px-3 py-2.5 font-bold font-mono text-emerald-600">
                      +₹{b.inrReturned.toLocaleString()} INR
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {new Date(b.burnTimestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <Hash value={b.burnTransactionHash} chars={8} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Cryptographically Chained Audit Ledger (Section 11) */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <span>⛓️</span> Cryptographic Audit Ledger (Hash Chained)
            </h3>
            <p className="text-xs text-slate-500">
              Chronologically traceable ledger with SHA-256 previous-hash commitments. Every coin generation
              and burn event is recorded.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {auditLedger.length} chained entries
          </span>
        </div>

        {auditLedger.length === 0 ? (
          <Empty>No audit entries recorded yet. Generate coins or perform a burn to view ledger entries.</Empty>
        ) : (
          <div className="mt-4 space-y-3">
            {[...auditLedger].reverse().map((entry, idx) => {
              const isBurn = entry.eventType === "COIN_BURN";
              return (
                <div
                  key={entry.auditId}
                  className={`rounded-xl border p-4 transition-colors ${
                    isBurn ? "border-rose-100 bg-rose-50/20" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">{entry.auditId}</span>
                      <Badge color={isBurn ? "red" : "blue"}>{entry.eventType}</Badge>
                      <span className="text-xs font-semibold text-slate-600">
                        {entry.generationId} · Block {entry.blockId}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
                    <div>
                      <span className="text-slate-400">Student:</span>{" "}
                      <span className="font-mono font-medium">{entry.studentId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Coins:</span>{" "}
                      <span className="font-bold text-slate-800 font-mono">
                        {entry.coinsGeneratedDisplay} EDU
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Reserve Snapshot:</span>{" "}
                      <span className="font-mono">₹{entry.reserveValue.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Winning Nonce:</span>{" "}
                      <span className="font-mono font-bold text-indigo-600">{entry.nonce}</span>
                    </div>
                  </div>

                  {/* Hash Chaining Inspection */}
                  <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px] font-mono text-slate-600 border border-slate-100 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Prev Audit Hash:</span>
                      <Hash value={entry.previousAuditHash} chars={12} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Curr Audit Hash:</span>
                      <Hash value={entry.currentAuditHash} chars={12} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
