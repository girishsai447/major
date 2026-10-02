"use client";

import { Fragment, useMemo, useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { api } from "@/lib/api";
import { LockedPage } from "@/components/LockedPage";
import { Card, SectionTitle, Button, EDU, Hash, Badge, Stat } from "@/components/ui";
import type { GenerationRecord, StudentRecord, EduCoinUnit } from "@/lib/types";

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

  // Modal & scrollbar states for inspecting each individual coin identity address
  const [modalGenRecord, setModalGenRecord] = useState<GenerationRecord | null>(null);
  const [modalCoinSearch, setModalCoinSearch] = useState<string>("" );
  const [copiedBatchId, setCopiedBatchId] = useState<string | null>(null);
  const [copiedSingleCoinId, setCopiedSingleCoinId] = useState<string | null>(null);
  const [expandedGenScrollbars, setExpandedGenScrollbars] = useState<Set<string>>(new Set());

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

  const allCoins: EduCoinUnit[] = useMemo(() => (data?.coins as EduCoinUnit[]) || [], [data?.coins]);

  const toggleGenScrollbar = (genId: string) => {
    setExpandedGenScrollbars((prev) => {
      const next = new Set(prev);
      if (next.has(genId)) next.delete(genId);
      else next.add(genId);
      return next;
    });
  };

  const getCoinsForGeneration = useMemo(() => {
    return (g: GenerationRecord) => {
      // 1. Direct match in allCoins by generationId or batchId
      const matchingUnits = allCoins.filter(
        (c) => c.generationId === g.generationId || c.batchId === g.generationId
      );
      if (matchingUnits.length > 0) {
        return matchingUnits.map((c) => ({
          serial: c.displaySerial,
          coinId: c.coinId,
          status: c.institutionalStatus || c.status,
          denomination: c.denomination || 100,
        }));
      }

      // 2. If matchingUnits not yet in allCoins but g.coinIds has them
      if (g.coinIds && g.coinIds.length > 0) {
        return g.coinIds.map((cid, i) => ({
          serial: `EDU-${g.generationId}-${String(i + 1).padStart(4, "0")}`,
          coinId: cid,
          status: "PRE_AUTHORIZED",
          denomination: 100,
        }));
      }

      // 3. Fallback: match by studentId in allCoins
      const studentCoins = allCoins.filter((c) => c.studentId === g.studentId);
      if (studentCoins.length > 0) {
        return studentCoins.slice(0, g.coinsDisplay).map((c) => ({
          serial: c.displaySerial,
          coinId: c.coinId,
          status: c.institutionalStatus || c.status,
          denomination: c.denomination || 100,
        }));
      }

      // 4. Default sequence derivation
      return Array.from({ length: g.coinsDisplay }).map((_, i) => ({
        serial: `EDU-${g.generationId}-${String(i + 1).padStart(4, "0")}`,
        coinId: `0x${g.hash.slice(0, 16)}${String(i + 1).padStart(4, "0")}...`,
        status: "PRE_AUTHORIZED",
        denomination: 100,
      }));
    };
  }, [allCoins]);

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
          `✅ Generation ${res.generationRecord.generationId} complete! Solved puzzle with Nonce ${res.generationRecord.nonce}. All ${coinAmount} individual coin addresses have been generated and dispatched to ${selectedStudent.instituteName}'s pre-registered fee whitelist!`
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

                  {/* Institutional Pre-Registration & Zero-Duplication Dispatch */}
                  <div className="mt-3 rounded-lg bg-indigo-50/80 p-2.5 border border-indigo-200 text-[11px] text-indigo-900">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>🏛️</span> Dispatched to Enrolled College: {latestGeneration.instituteName} ({latestGeneration.instituteId})
                    </div>
                    <p className="mt-1 text-slate-600 font-sans leading-relaxed">
                      All <b>{latestGeneration.coinsDisplay} individual coin addresses</b> have been pre-registered on {latestGeneration.instituteName}&apos;s verified whitelist. When the student pays fees, the institution can cross-check the coin addresses to ensure zero duplication and prevent counterfeit tokens.
                    </p>
                    {latestGeneration.coinIds && latestGeneration.coinIds.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-indigo-100">
                        <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 mb-1">
                          <span>Unique Coin Identity Addresses ({latestGeneration.coinIds.length} units):</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(latestGeneration.coinIds?.join("\n") || "");
                              alert(`Copied all ${latestGeneration.coinIds?.length} unique coin addresses to clipboard!`);
                            }}
                            className="text-indigo-600 hover:underline font-sans font-semibold"
                          >
                            📋 Copy All Addresses
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                          {latestGeneration.coinIds.slice(0, 10).map((cid, i) => (
                            <span key={i} className="rounded bg-white px-1 py-0.5 border border-indigo-200 text-[9px] text-indigo-700 truncate max-w-[120px]">
                              {cid.slice(0, 10)}...
                            </span>
                          ))}
                          {latestGeneration.coinIds.length > 10 && (
                            <span className="text-slate-400 self-center text-[10px]">
                              +{latestGeneration.coinIds.length - 10} more addresses
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-right">
                          <a
                            href="/coins"
                            className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 underline"
                          >
                            🔍 Cross-Check in College Whitelist Registry &rarr;
                          </a>
                        </div>
                      </div>
                    )}
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
                    <Fragment key={g.generationId}>
                      <tr className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 font-bold font-mono text-slate-800">
                        {g.generationId}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-700">
                        {g.studentName} <span className="text-slate-400 font-mono">({g.studentId})</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">{g.instituteName}</td>
                      <td className="px-3 py-2.5">
                        <div className="space-y-1">
                          <div className="font-bold text-emerald-600 font-mono flex items-center gap-1">
                            <span>{g.coinsDisplay} EDU</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              (₹{(g.coinsDisplay * 100).toLocaleString()})
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {/* Pop-up Button */}
                            <button
                              type="button"
                              onClick={() => setModalGenRecord(g)}
                              className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1 shadow-2xs"
                              title="Click to open pop-up showing each individual coin identity address"
                            >
                              <span>🪙</span> View {g.coinsDisplay} IDs
                            </button>

                            {/* Inline Scrollbar Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleGenScrollbar(g.generationId)}
                              className="rounded-lg bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors"
                              title="Toggle inline scroll bar list of coin addresses"
                            >
                              {expandedGenScrollbars.has(g.generationId) ? "▲ Hide" : "📜 Scroll"}
                            </button>
                          </div>
                        </div>
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

                    {/* Inline Expandable Scroll Bar of Individual Coin Identity Addresses */}
                    {expandedGenScrollbars.has(g.generationId) && (() => {
                      const coinsForThisGen = getCoinsForGeneration(g);
                      return (
                        <tr key={`scroll-${g.generationId}`} className="bg-indigo-50/40">
                          <td colSpan={10} className="p-3">
                            <div className="rounded-xl border border-indigo-200 bg-white p-3 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>🪙</span> Individual Coin Identity Addresses for {g.generationId} ({coinsForThisGen.length} coins · ₹{(coinsForThisGen.length * 100).toLocaleString()} INR):
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(coinsForThisGen.map((c) => c.coinId).join("\n"));
                                      setCopiedBatchId(g.generationId);
                                      setTimeout(() => setCopiedBatchId(null), 2500);
                                    }}
                                    className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                                  >
                                    {copiedBatchId === g.generationId ? "✓ Copied All!" : "📋 Copy All Addresses"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setModalGenRecord(g)}
                                    className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50 border border-indigo-200"
                                  >
                                    🔍 Open Pop-up
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleGenScrollbar(g.generationId)}
                                    className="text-[11px] text-slate-400 hover:text-slate-600 font-bold px-1"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>

                              {/* Inline Scroll Bar Box */}
                              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                                {coinsForThisGen.map((c, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between rounded bg-slate-50 px-2.5 py-1 border border-slate-100 hover:bg-indigo-50/50"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="font-bold text-indigo-800">{c.serial}:</span>
                                      <span className="text-slate-600 truncate max-w-sm sm:max-w-md font-mono">{c.coinId}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-emerald-700 font-semibold font-mono">₹{c.denomination}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(c.coinId);
                                          setCopiedSingleCoinId(c.coinId);
                                          setTimeout(() => setCopiedSingleCoinId(null), 2000);
                                        }}
                                        className="text-slate-400 hover:text-indigo-600"
                                        title="Copy address"
                                      >
                                        {copiedSingleCoinId === c.coinId ? "✓" : "📋"}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL POP-UP: Serialized Coin Identity Addresses for this Generation Batch */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {modalGenRecord && (() => {
        const batchCoins = getCoinsForGeneration(modalGenRecord);
        const filteredCoins = modalCoinSearch.trim()
          ? batchCoins.filter(
              (c) =>
                c.serial.toLowerCase().includes(modalCoinSearch.toLowerCase()) ||
                c.coinId.toLowerCase().includes(modalCoinSearch.toLowerCase())
            )
          : batchCoins;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🪙</span>
                    <h3 className="text-base font-bold text-slate-900">
                      Serialized Coin Identity Addresses — {modalGenRecord.generationId}
                    </h3>
                    <Badge color="green">
                      {batchCoins.length} Unique Coins
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Student: <b>{modalGenRecord.studentName}</b> ({modalGenRecord.studentId}) · Enrolled at:{" "}
                    <b>{modalGenRecord.instituteName}</b> ({modalGenRecord.instituteId})
                  </div>
                </div>
                <button
                  onClick={() => {
                    setModalGenRecord(null);
                    setModalCoinSearch("");
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Pre-Registration Whitelist Dispatch Notice */}
              <div className="rounded-xl bg-indigo-50/70 p-3 text-xs border border-indigo-100 text-indigo-950 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏛️</span>
                  <span>
                    <strong>Dispatched to College Whitelist:</strong> All {batchCoins.length} coin identity addresses have been pre-registered to <b>{modalGenRecord.instituteName}</b>. When fees are paid, the college cross-checks this exact list for zero duplication.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(batchCoins.map((c) => c.coinId).join("\n"));
                    setCopiedBatchId(modalGenRecord.generationId);
                    setTimeout(() => setCopiedBatchId(null), 2500);
                  }}
                  className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-50 shadow-xs"
                >
                  {copiedBatchId === modalGenRecord.generationId
                    ? "✓ Copied All Addresses!"
                    : `📋 Copy All ${batchCoins.length} Addresses`}
                </button>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex items-center justify-between gap-3 shrink-0">
                <input
                  type="text"
                  placeholder="Filter serial (e.g. 0001) or address (0x...)..."
                  value={modalCoinSearch}
                  onChange={(e) => setModalCoinSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 bg-slate-50/50 font-mono"
                />
                <span className="text-xs text-slate-400 whitespace-nowrap font-mono">
                  {filteredCoins.length} of {batchCoins.length} coins
                </span>
              </div>

              {/* Scrollable list with prominent scroll bar showing each coin's unique identity address */}
              <div className="flex-1 overflow-y-auto max-h-[50vh] pr-1 space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50/40">
                {filteredCoins.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No coin addresses match &ldquo;{modalCoinSearch}&rdquo;
                  </div>
                ) : (
                  filteredCoins.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 border border-slate-200 hover:border-indigo-300 transition-all text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {c.serial}
                        </span>
                        <span className="font-mono text-[11px] text-slate-600 truncate max-w-[280px] sm:max-w-md" title={c.coinId}>
                          {c.coinId}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-600 text-[11px]">
                          ₹{c.denomination}
                        </span>
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-800">
                          {c.status || "PRE_AUTHORIZED"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(c.coinId);
                            setCopiedSingleCoinId(c.coinId);
                            setTimeout(() => setCopiedSingleCoinId(null), 2000);
                          }}
                          className="rounded p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 text-xs"
                          title="Copy Coin Address"
                        >
                          {copiedSingleCoinId === c.coinId ? "✓" : "📋"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 shrink-0">
                <div className="text-[11px] text-slate-400 font-mono">
                  1 EDU = ₹100 INR · Nonce: {modalGenRecord.nonce} · Puzzle Hash: {modalGenRecord.hash.slice(0, 10)}...
                </div>
                <Button
                  onClick={() => {
                    setModalGenRecord(null);
                    setModalCoinSearch("");
                  }}
                  className="text-xs px-4 py-1.5"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
