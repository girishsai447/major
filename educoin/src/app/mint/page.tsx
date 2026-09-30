"use client";

import { useMemo, useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { api } from "@/lib/api";
import { LockedPage } from "@/components/LockedPage";
import { Card, SectionTitle, Button, EDU, Hash, Badge, Stat } from "@/components/ui";
import type { GenerationRecord, StudentRecord } from "@/lib/types";

export default function MintPage() {
  const { enabled } = useStage();
  const { data, refresh } = useChainData();

  // Government Minting States
  const [selectedStudentId, setSelectedStudentId] = useState<string>("STU001");
  const [coinAmount, setCoinAmount] = useState<number>(50);
  const [authorityId, setAuthorityId] = useState<string>("GOV-MINISTRY-EDU-01");
  const [miningSimulation, setMiningSimulation] = useState<boolean>(false);
  const [latestGeneration, setLatestGeneration] = useState<GenerationRecord | null>(null);
  const [decryptedRecordId, setDecryptedRecordId] = useState<string | null>(null);
  const [decryptedData, setDecryptedData] = useState<Record<string, unknown> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Legacy tab option
  const [showLegacyMode, setShowLegacyMode] = useState<boolean>(false);
  const [legacyTo, setLegacyTo] = useState("");
  const [legacyAmount, setLegacyAmount] = useState(500);
  const [legacyMemo, setLegacyMemo] = useState("");
  const [legacyBusy, setLegacyBusy] = useState(false);

  if (!enabled("minting")) return <LockedPage feature="minting" />;

  const students: StudentRecord[] = data?.students ?? [];
  const selectedStudent = useMemo(
    () => students.find((s) => s.studentId === selectedStudentId) || students[0],
    [students, selectedStudentId]
  );

  const govMetrics = data?.govMetrics;
  const reserveINR = govMetrics?.totalReserveINR ?? data?.reserve.reserveINR ?? 0;
  const maxCoins = govMetrics?.maxReserveBackedCoins ?? Math.floor(reserveINR / 100);
  const circulating = govMetrics?.circulatingCoins ?? 0;
  const remainingCapacity = govMetrics?.remainingMintingCapacity ?? Math.max(0, maxCoins - circulating);

  const studentExpiryDate = selectedStudent ? new Date(selectedStudent.academicCompletionDate) : null;
  const instituteExpiryDate = selectedStudent
    ? new Date(selectedStudent.academicCompletionDate + 1000 * 60 * 60 * 24 * 183)
    : null;

  // Execute block + puzzle + nonce + hash minting
  const handleGenerateCoins = async () => {
    if (!selectedStudent || coinAmount <= 0) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setMiningSimulation(true);

    try {
      // Simulate nonce puzzle solving for 400ms so user sees the cryptographic mining in action
      await new Promise((r) => setTimeout(r, 450));

      const res = await api.generateCoins(selectedStudent.studentId, coinAmount, authorityId);
      if (res.accepted && res.generationRecord) {
        setLatestGeneration(res.generationRecord);
        setSuccessMsg(
          `✅ Generation ${res.generationRecord.generationId} created! Solved puzzle with Nonce ${res.generationRecord.nonce}. Status: GENERATED (Wallet: NOT LINKED)`
        );
        await refresh();
      } else {
        setErrorMsg(res.error || "Failed to generate coins");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error generating coins";
      setErrorMsg(msg);
    } finally {
      setMiningSimulation(false);
    }
  };

  // Decrypt AES-256-GCM transaction payload
  const handleDecrypt = async (record: GenerationRecord) => {
    if (!record.encryptedPayload) return;
    if (decryptedRecordId === record.generationId) {
      setDecryptedRecordId(null);
      setDecryptedData(null);
      return;
    }
    try {
      const res = await api.decrypt(
        record.encryptedPayload.ciphertext,
        record.encryptedPayload.iv,
        record.encryptedPayload.tag
      );
      if (res.success && res.decrypted) {
        setDecryptedRecordId(record.generationId);
        setDecryptedData(res.decrypted as Record<string, unknown>);
      }
    } catch (err: unknown) {
      alert("Decryption failed: " + (err instanceof Error ? err.message : "Unauthorized"));
    }
  };

  // Legacy wallet minting handler
  const handleLegacyMint = async () => {
    if (!legacyTo || legacyAmount <= 0) return;
    setLegacyBusy(true);
    try {
      const res = await api.mint(legacyTo, legacyAmount, legacyMemo || undefined);
      if (res.accepted) {
        setSuccessMsg("Legacy issuance submitted to mempool. Mine a block to confirm.");
      } else {
        setErrorMsg(res.reason || "Rejected");
      }
      await refresh();
    } finally {
      setLegacyBusy(false);
    }
  };

  const generationHistory = [...(data?.generationRecords ?? [])].reverse();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionTitle
          icon="🪙"
          title="Government Coin Generation Portal"
          subtitle="Block + Puzzle + Nonce + Hash-based minting pegged at 1 EDU = ₹100 INR. Only the Government Treasury can initiate issuance. Funds are allocated with student & institute expiries without direct wallet transfer."
        />
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
            🏛️ Government Authority
          </span>
          <button
            onClick={() => setShowLegacyMode(!showLegacyMode)}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            {showLegacyMode ? "Switch to Puzzle Minting" : "Show Legacy Wallet Minting"}
          </button>
        </div>
      </div>

      {/* Reserve & Minting Capacity Indicators */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total INR Reserve" value={`₹${reserveINR.toLocaleString()}`} accent="#10b981" />
        <Stat label="Max Reserve Coins" value={`${maxCoins.toLocaleString()} EDU`} />
        <Stat label="Circulating Supply" value={`${circulating.toLocaleString()} EDU`} accent="#6366f1" />
        <Stat
          label="Remaining Capacity"
          value={`${remainingCapacity.toLocaleString()} EDU`}
          accent={remainingCapacity > 0 ? "#059669" : "#e11d48"}
        />
      </div>

      {!showLegacyMode ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Minting Form Card */}
          <Card className="p-6 lg:col-span-7">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <span>⛏️</span> Configure Coin Generation
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Select student, verify academic completion date, and solve cryptographic puzzle.
            </p>

            <div className="mt-4 space-y-4">
              {/* Student Selection */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Select Registered Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-brand-500"
                >
                  {students.map((s) => (
                    <option key={s.studentId} value={s.studentId}>
                      {s.studentId} — {s.name} ({s.instituteName}, {s.academicLevel})
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Metadata Card */}
              {selectedStudent && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs space-y-2">
                  <div className="font-semibold text-slate-700 border-b border-slate-200 pb-1.5 flex justify-between">
                    <span>Student Profile & Expiry Metadata</span>
                    <span className="text-indigo-600 font-mono">{selectedStudent.studentId}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-slate-400">Student Name:</span>{" "}
                      <span className="font-medium text-slate-800">{selectedStudent.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Institute:</span>{" "}
                      <span className="font-medium text-slate-800">{selectedStudent.instituteName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Academic Level:</span>{" "}
                      <span className="font-medium text-slate-800">{selectedStudent.academicLevel}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Academic Completion:</span>{" "}
                      <span className="font-medium text-slate-800">
                        {studentExpiryDate?.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-200 flex flex-wrap gap-4 text-[11px]">
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        ⏳ <b>Student Expiry:</b> {studentExpiryDate?.toLocaleDateString()}
                      </span>
                      <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        🏛️ <b>Institute Expiry:</b> {instituteExpiryDate?.toLocaleDateString()} (+6 mos)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Amount and Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Number of EDU Coins
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={coinAmount}
                    onChange={(e) => setCoinAmount(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500 font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    INR Value (1 EDU = ₹100)
                  </label>
                  <div className="flex h-10 items-center rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-700 font-mono">
                    ₹{(coinAmount * 100).toLocaleString()} INR
                  </div>
                </div>
              </div>

              {/* Government Authority ID */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Government Authority ID
                </label>
                <input
                  type="text"
                  value={authorityId}
                  onChange={(e) => setAuthorityId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-500 font-mono"
                />
              </div>

              {/* Invariant Warning */}
              <div className="rounded-lg bg-blue-50/70 p-3 text-xs text-blue-800 border border-blue-100 flex items-start gap-2">
                <span>ℹ️</span>
                <div>
                  <b>Reserve Invariant Check:</b> Maximum allowed coins from reserve ={" "}
                  <b>{maxCoins} EDU</b>. New request of <b>{coinAmount} EDU</b> requires ₹
                  {(coinAmount * 100).toLocaleString()} INR reserve backing.
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  onClick={handleGenerateCoins}
                  disabled={miningSimulation || coinAmount <= 0 || coinAmount > remainingCapacity}
                  className="w-full justify-center py-2.5 text-sm"
                >
                  {miningSimulation ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⚙️</span> Solving Cryptographic Puzzle (nonce++)...
                    </span>
                  ) : (
                    <span>⛏️ Solve Puzzle & Generate {coinAmount} EDU Coins</span>
                  )}
                </Button>
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                  <b>Error:</b> {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200">
                  {successMsg}
                </div>
              )}
            </div>
          </Card>

          {/* Latest Solved Puzzle / Allocation Record Preview */}
          <Card className="p-6 lg:col-span-5 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <span>📜</span> Allocation & Puzzle Details
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Phase decoupled from wallets: stores allocation record with status{" "}
                <b className="text-slate-700">NOT LINKED</b>.
              </p>

              {latestGeneration ? (
                <div className="mt-4 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs font-mono">
                  <div className="flex justify-between items-center pb-2 border-b border-emerald-200">
                    <span className="font-bold text-emerald-900">{latestGeneration.generationId}</span>
                    <Badge color="green">{latestGeneration.status}</Badge>
                  </div>
                  <div className="space-y-1.5 text-emerald-800">
                    <div>
                      <span className="text-slate-500">Block ID:</span> {latestGeneration.blockId}
                    </div>
                    <div>
                      <span className="text-slate-500">Student:</span> {latestGeneration.studentName} (
                      {latestGeneration.studentId})
                    </div>
                    <div>
                      <span className="text-slate-500">Coins:</span> {latestGeneration.coinsDisplay} EDU (₹
                      {latestGeneration.totalValue.toLocaleString()} INR)
                    </div>
                    <div>
                      <span className="text-slate-500">Student Expiry:</span>{" "}
                      {new Date(latestGeneration.studentExpiry).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="text-slate-500">Institute Expiry:</span>{" "}
                      {new Date(latestGeneration.instituteExpiry).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="text-slate-500">Winning Nonce:</span> {latestGeneration.nonce}
                    </div>
                    <div>
                      <span className="text-slate-500">Puzzle Hash:</span>{" "}
                      <Hash value={latestGeneration.hash} chars={12} />
                    </div>
                    <div className="pt-1 text-[11px] text-indigo-700">
                      🔒 Wallet Status: <b>{latestGeneration.walletStatus}</b>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                  <span className="text-3xl mb-2">🧩</span>
                  No generation record created yet in this session.
                  <br />
                  Select a student and click "Solve Puzzle & Generate".
                </div>
              )}
            </div>

            <div className="mt-6 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 border border-slate-100">
              <b>Supervisor Note:</b> Nonce iterations find the puzzle hash condition; they do not dictate
              the coin supply. Reserve backing determines total allowed issuance.
            </div>
          </Card>
        </div>
      ) : (
        /* Legacy Wallet Minting Card */
        <Card className="p-6 max-w-xl">
          <h3 className="text-base font-semibold text-slate-800">Legacy Direct Wallet Minting</h3>
          <p className="mt-1 text-xs text-slate-500">
            Stages 1-5 legacy fallback: creates a mempool MINT transaction to a wallet address.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Recipient Wallet</label>
              <select
                value={legacyTo}
                onChange={(e) => setLegacyTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
              >
                <option value="">Select a wallet...</option>
                {data?.wallets.map((w) => (
                  <option key={w.address} value={w.address}>
                    {w.name} · {w.role}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Amount (EDU)</label>
              <input
                type="number"
                value={legacyAmount}
                onChange={(e) => setLegacyAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Memo</label>
              <input
                type="text"
                value={legacyMemo}
                onChange={(e) => setLegacyMemo(e.target.value)}
                placeholder="Optional memo"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
              />
            </div>
            <Button onClick={handleLegacyMint} disabled={legacyBusy || !legacyTo}>
              Submit Legacy Mint to Mempool
            </Button>
          </div>
        </Card>
      )}

      {/* Generation History Table */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Coin Generation History</h3>
            <p className="text-xs text-slate-500">
              Complete log of puzzle blocks, nonce solutions, and encrypted issuance payloads.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {generationHistory.length} total generation events
          </span>
        </div>

        {generationHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No coin generations recorded yet.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Gen ID</th>
                  <th className="px-3 py-2.5">Student</th>
                  <th className="px-3 py-2.5">Institute</th>
                  <th className="px-3 py-2.5">Coins</th>
                  <th className="px-3 py-2.5">Student Expiry</th>
                  <th className="px-3 py-2.5">Institute Expiry</th>
                  <th className="px-3 py-2.5">Nonce</th>
                  <th className="px-3 py-2.5">Puzzle Hash</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">AES-256 Record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {generationHistory.map((g) => {
                  const isDecrypted = decryptedRecordId === g.generationId;
                  return (
                    <tr key={g.generationId} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 font-bold font-mono text-slate-800">
                        {g.generationId}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-700">
                        {g.studentName} <span className="text-slate-400 font-mono">({g.studentId})</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">{g.instituteName}</td>
                      <td className="px-3 py-2.5 font-bold text-emerald-600 font-mono">
                        {g.coinsDisplay} EDU
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {new Date(g.studentExpiry).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {new Date(g.instituteExpiry).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">{g.nonce}</td>
                      <td className="px-3 py-2.5">
                        <Hash value={g.hash} chars={6} />
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          color={
                            g.status === "GENERATED"
                              ? "green"
                              : g.status === "BURNED"
                              ? "red"
                              : "amber"
                          }
                        >
                          {g.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        {g.encryptedPayload ? (
                          <div className="space-y-1">
                            <button
                              onClick={() => handleDecrypt(g)}
                              className="rounded px-2 py-1 text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                            >
                              {isDecrypted ? "Hide Decrypted" : "🔓 Decrypt Record"}
                            </button>
                            {isDecrypted && decryptedData && (
                              <div className="mt-1 max-w-xs rounded bg-slate-900 p-2 text-[10px] text-emerald-400 font-mono">
                                <div>Student: {String(decryptedData.studentName)}</div>
                                <div>Coins: {String(decryptedData.coinsGenerated)} EDU</div>
                                <div>Reserve: ₹{Number(decryptedData.reserveAtMint).toLocaleString()}</div>
                                <div className="truncate text-slate-400">Hash: {String(decryptedData.hash)}</div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Plaintext</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
