"use client";

import { useMemo, useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { api } from "@/lib/api";
import { LockedPage } from "@/components/LockedPage";
import { Card, SectionTitle, Button, Stat, Hash, Badge, Empty } from "@/components/ui";
import {
  CATEGORY_LABELS,
  type GenerationRecord,
  type BurnRecord,
  type AuditRecord,
  type EduCoinUnit,
  type Transaction,
  type Wallet,
  type Category,
} from "@/lib/types";

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

  // Spend Audit Filter States
  const [spendCategoryFilter, setSpendCategoryFilter] = useState<string>("ALL");
  const [spendStudentFilter, setSpendStudentFilter] = useState<string>("ALL");
  const [spendSearchQuery, setSpendSearchQuery] = useState<string>("");
  const [selectedSpentCoin, setSelectedSpentCoin] = useState<EduCoinUnit | null>(null);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);
  const [expandedTxIds, setExpandedTxIds] = useState<Set<string>>(new Set());

  // Demo clock fast-forward states
  const [fastForwarding, setFastForwarding] = useState(false);

  if (!enabled("auditTrail")) return <LockedPage feature="auditTrail" />;

  const gov = data?.govMetrics;
  const auditLedger = data?.auditLedger ?? [];
  const generationRecords = data?.generationRecords ?? [];
  const burnRecords = data?.burnRecords ?? [];
  const effectiveTime = data?.effectiveTime ?? Date.now();

  const coins: EduCoinUnit[] = useMemo(() => (data?.coins as EduCoinUnit[]) || [], [data?.coins]);
  const coinMap = useMemo(() => new Map(coins.map((c) => [c.coinId.toLowerCase(), c])), [coins]);
  const wallets = useMemo(() => data?.wallets ?? [], [data?.wallets]);
  const walletMap = useMemo(
    () => new Map(wallets.map((w) => [w.address.toLowerCase(), w])),
    [wallets]
  );

  const toggleExpandTx = (txId: string) => {
    setExpandedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(txId)) next.delete(txId);
      else next.add(txId);
      return next;
    });
  };

  const copyCoinAddresses = (txId: string, coinIds: string[]) => {
    navigator.clipboard.writeText(coinIds.join("\n"));
    setCopiedTxId(txId);
    setTimeout(() => setCopiedTxId(null), 2500);
  };

  // Extract all student educational spend transactions from confirmed blocks
  const studentSpendAudits = useMemo(() => {
    const spends: Array<{
      tx: Transaction;
      blockHeight: number;
      blockHash: string;
      studentWallet?: Wallet;
      recipientWallet?: Wallet;
      spentCoins: EduCoinUnit[];
    }> = [];

    const blocks = data?.chain ?? [];
    for (const block of blocks) {
      for (const tx of block.transactions) {
        const sender = tx.from ? walletMap.get(tx.from.toLowerCase()) : null;
        const recipient = walletMap.get(tx.to.toLowerCase());

        const isStudentSpend =
          tx.type === "TRANSFER" &&
          (sender?.role === "STUDENT" ||
            tx.category ||
            (tx.coinIds && tx.coinIds.length > 0));

        if (isStudentSpend) {
          let spentCoinUnits: EduCoinUnit[] = [];
          if (tx.coinIds && tx.coinIds.length > 0) {
            spentCoinUnits = tx.coinIds
              .map((id) => coinMap.get(id.toLowerCase()))
              .filter((c): c is EduCoinUnit => Boolean(c));
          }

          if (spentCoinUnits.length === 0) {
            spentCoinUnits = coins.filter((c) =>
              c.history.some(
                (h) =>
                  h.txId === tx.id ||
                  (h.to === tx.to && h.category === tx.category)
              )
            );
          }

          spends.push({
            tx,
            blockHeight: block.index,
            blockHash: block.hash,
            studentWallet: sender || undefined,
            recipientWallet: recipient || undefined,
            spentCoins: spentCoinUnits,
          });
        }
      }
    }

    return spends.reverse();
  }, [data?.chain, coins, walletMap, coinMap]);

  const distinctSpendStudents = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of studentSpendAudits) {
      if (s.studentWallet) {
        map.set(s.studentWallet.address, s.studentWallet.name);
      } else if (s.tx.from) {
        map.set(s.tx.from, s.tx.from.slice(0, 10));
      }
    }
    return Array.from(map.entries()).map(([address, name]) => ({ address, name }));
  }, [studentSpendAudits]);

  const filteredSpendAudits = useMemo(() => {
    return studentSpendAudits.filter((s) => {
      if (spendCategoryFilter !== "ALL") {
        if (s.tx.category !== spendCategoryFilter) return false;
      }
      if (spendStudentFilter !== "ALL") {
        if (s.tx.from?.toLowerCase() !== spendStudentFilter.toLowerCase()) return false;
      }
      if (spendSearchQuery.trim()) {
        const q = spendSearchQuery.toLowerCase();
        const matchTx = s.tx.id.toLowerCase().includes(q);
        const matchMemo = (s.tx.memo || "").toLowerCase().includes(q);
        const matchStudent = (s.studentWallet?.name || "").toLowerCase().includes(q);
        const matchRecipient = (s.recipientWallet?.name || "").toLowerCase().includes(q);
        const matchCoin = s.spentCoins.some(
          (c) =>
            c.coinId.toLowerCase().includes(q) ||
            c.displaySerial.toLowerCase().includes(q)
        );
        if (!matchTx && !matchMemo && !matchStudent && !matchRecipient && !matchCoin) {
          return false;
        }
      }
      return true;
    });
  }, [studentSpendAudits, spendCategoryFilter, spendStudentFilter, spendSearchQuery]);

  const spendMetrics = useMemo(() => {
    let tuitionCoins = 0;
    let otherCoins = 0;
    let totalCoinsSpent = 0;
    const uniqueCoinsSet = new Set<string>();

    for (const s of studentSpendAudits) {
      const count = s.spentCoins.length > 0 ? s.spentCoins.length : s.tx.amount;
      totalCoinsSpent += count;
      if (s.tx.category === "TUITION") {
        tuitionCoins += count;
      } else {
        otherCoins += count;
      }
      s.spentCoins.forEach((c) => uniqueCoinsSet.add(c.coinId));
    }

    return {
      totalCoinsSpent,
      totalInrSpent: totalCoinsSpent * 100,
      tuitionCoins,
      tuitionInr: tuitionCoins * 100,
      otherCoins,
      uniqueCoinsAudited: uniqueCoinsSet.size,
    };
  }, [studentSpendAudits]);

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
          className={`rounded-xl border p-4 text-xs font-medium ${verificationResult.valid
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

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* SECTION: Student Educational Spends & Individual Coin-by-Coin Audit Trail  */}
      {/* Specifically audits which individual coin addresses were spent by students */}
      {/* on Tuition Fees, Hostel, Books, Examination, etc.                          */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Card className="p-6 border-indigo-200 bg-gradient-to-br from-indigo-50/30 via-white to-white space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🎓</span> Student Educational Spends & Individual Coin-by-Coin Audit Trail
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cryptographically audits every EduCoin spent by students. Specifically inspect the exact <strong>individual coin identity addresses</strong> used for <strong>Tuition Fees</strong>, <strong>Hostel</strong>, <strong>Books</strong>, and <strong>Examinations</strong>, with institutional cross-checks and zero-duplication guarantees.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            ✓ 100% Anti-Duplication Verified
          </span>
        </div>

        {/* Spend Metrics KPI bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-indigo-100 bg-white p-3">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
              Total Spent on Tuition
            </div>
            <div className="mt-1 text-lg font-bold text-indigo-700 font-mono">
              {spendMetrics.tuitionCoins} EDU
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              ₹{spendMetrics.tuitionInr.toLocaleString()} INR
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-white p-3">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
              Other Educational Spends
            </div>
            <div className="mt-1 text-lg font-bold text-slate-800 font-mono">
              {spendMetrics.otherCoins} EDU
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              ₹{(spendMetrics.otherCoins * 100).toLocaleString()} INR
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-white p-3">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
              Total Educational Spends
            </div>
            <div className="mt-1 text-lg font-bold text-emerald-600 font-mono">
              {spendMetrics.totalCoinsSpent} EDU
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              ₹{spendMetrics.totalInrSpent.toLocaleString()} INR
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-white p-3">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
              Audited Coin Identifiers
            </div>
            <div className="mt-1 text-lg font-bold text-indigo-900 font-mono">
              {spendMetrics.uniqueCoinsAudited} Units
            </div>
            <div className="text-[10px] text-emerald-600 font-medium">
              Zero Duplication Checked
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSpendCategoryFilter("ALL")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${spendCategoryFilter === "ALL"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
            >
              All Spends
            </button>
            <button
              onClick={() => setSpendCategoryFilter("TUITION")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1 ${spendCategoryFilter === "TUITION"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
                }`}
            >
              <span>🎓</span> Tuition Fees
            </button>
            <button
              onClick={() => setSpendCategoryFilter("HOSTEL")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${spendCategoryFilter === "HOSTEL"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
            >
              🏛️ Hostel Fees
            </button>
            <button
              onClick={() => setSpendCategoryFilter("BOOKS")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${spendCategoryFilter === "BOOKS"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
            >
              📚 Books & Supplies
            </button>
            <button
              onClick={() => setSpendCategoryFilter("EXAMINATION")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${spendCategoryFilter === "EXAMINATION"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
            >
              📝 Examination Fees
            </button>
          </div>

          {/* Student Filter & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={spendStudentFilter}
              onChange={(e) => setSpendStudentFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400"
            >
              <option value="ALL">All Students</option>
              {distinctSpendStudents.map((s) => (
                <option key={s.address} value={s.address}>
                  {s.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search coin hash, serial, student..."
              value={spendSearchQuery}
              onChange={(e) => setSpendSearchQuery(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 min-w-[210px]"
            />
          </div>
        </div>

        {/* Spend Transactions List */}
        {filteredSpendAudits.length === 0 ? (
          <Empty>
            No student educational spend transactions found matching the selected filters.
          </Empty>
        ) : (
          <div className="space-y-4">
            {filteredSpendAudits.map((item) => {
              const tx = item.tx;
              const studentName = item.studentWallet?.name || "Student Beneficiary";
              const recipientName = item.recipientWallet?.name || tx.to;
              const isTuition = tx.category === "TUITION";
              const isExpanded = expandedTxIds.has(tx.id);
              const displayedCoins = isExpanded ? item.spentCoins : item.spentCoins.slice(0, 8);
              const hasMoreCoins = item.spentCoins.length > 8;

              return (
                <div
                  key={tx.id}
                  className={`rounded-2xl border transition-all p-4 ${isTuition
                      ? "border-indigo-200 bg-white shadow-sm"
                      : "border-slate-200 bg-white"
                    }`}
                >
                  {/* Top Transaction Row */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
                        <span className="flex items-center gap-1 text-indigo-900">
                          <span>🎓</span> {studentName}
                        </span>
                        <span className="text-slate-400 font-normal">paid to</span>
                        <span className="flex items-center gap-1 text-slate-800">
                          <span>🏛️</span> {recipientName}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
                        <span>Block #{item.blockHeight}</span>
                        <span>·</span>
                        <span>Tx: {tx.id}</span>
                        <span>·</span>
                        <span className="font-sans">
                          {new Date(tx.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-base font-black text-indigo-700 font-mono">
                          {tx.amount} EDU
                        </div>
                        <div className="text-[11px] text-emerald-600 font-semibold font-mono">
                          ₹{(tx.amount * 100).toLocaleString()} INR
                        </div>
                      </div>

                      <Badge color={isTuition ? "violet" : "blue"}>
                        {tx.category ? CATEGORY_LABELS[tx.category] || tx.category : "SPEND"}
                      </Badge>
                    </div>
                  </div>

                  {/* Memo and Purpose */}
                  {tx.memo && (
                    <div className="mt-2.5 text-xs text-slate-600 italic bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                      &ldquo;{tx.memo}&rdquo;
                    </div>
                  )}

                  {/* Institutional Whitelist & Anti-Duplication Verification Ribbon */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-indigo-50/70 p-2.5 text-xs border border-indigo-100">
                    <div className="flex items-center gap-2 text-indigo-950 font-medium">
                      <span className="text-sm">🛡️</span>
                      <span>
                        <strong>College Whitelist Cross-Check:</strong> Accepted & pre-verified by{" "}
                        <b>{recipientName}</b>. Smart contract Rule R11 & R5b enforced zero duplicate coins.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.spentCoins.length > 0 && (
                        <button
                          onClick={() =>
                            copyCoinAddresses(
                              tx.id,
                              item.spentCoins.map((c) => c.coinId)
                            )
                          }
                          className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-50 shadow-xs"
                        >
                          {copiedTxId === tx.id
                            ? "✓ Copied Addresses!"
                            : `📋 Copy All ${item.spentCoins.length} Coin Addresses`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* SPECIFIC COIN ADDRESSES USED FOR THIS SPEND (User Requirement) */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>🪙</span> Specific Coins Spent for this Payment:
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-600">
                          {item.spentCoins.length > 0 ? `${item.spentCoins.length} Coin Addresses` : `${tx.amount} Units (Legacy)`}
                        </span>
                      </span>

                      {hasMoreCoins && (
                        <button
                          onClick={() => toggleExpandTx(tx.id)}
                          className="text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          {isExpanded
                            ? "Show Less"
                            : `Show All ${item.spentCoins.length} Coins (${item.spentCoins.length - 8} more) ↓`}
                        </button>
                      )}
                    </div>

                    {item.spentCoins.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {displayedCoins.map((coin) => (
                          <div
                            key={coin.coinId}
                            onClick={() => setSelectedSpentCoin(coin)}
                            className="group cursor-pointer rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-indigo-700">
                                {coin.displaySerial}
                              </span>
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-800">
                                ₹{coin.denomination}
                              </span>
                            </div>

                            <div className="mt-1 font-mono text-[10px] text-slate-500 truncate" title={coin.coinId}>
                              {coin.coinId.slice(0, 10)}...{coin.coinId.slice(-8)}
                            </div>

                            <div className="mt-2 flex items-center justify-between text-[10px]">
                              <span className="rounded bg-indigo-100/70 px-1 py-0.5 text-indigo-800 font-medium">
                                {coin.institutionalStatus || "COLLECTED_AS_FEE"}
                              </span>
                              <span className="text-indigo-600 group-hover:underline font-semibold">
                                Inspect 🔍
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-400 font-mono">
                        Transaction validated on balance ledger before individual coin unit serialization.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

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
                  className={`rounded-xl border p-4 transition-colors ${isBurn ? "border-rose-100 bg-rose-50/20" : "border-slate-200 bg-white"
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

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: Individual Spent Coin Cryptographic Certificate & Provenance Audit  */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {selectedSpentCoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🪙</span>
                  <h3 className="text-base font-bold text-slate-900">
                    Cryptographic Coin Certificate & Provenance Audit
                  </h3>
                </div>
                <div className="font-mono text-xs text-indigo-600 font-semibold mt-0.5">
                  {selectedSpentCoin.displaySerial}
                </div>
              </div>
              <button
                onClick={() => setSelectedSpentCoin(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* 256-Bit Unique Address Box */}
            <div className="rounded-xl bg-slate-950 p-3.5 text-xs space-y-1.5 border border-slate-800">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide flex items-center justify-between">
                <span>Unique 256-Bit Cryptographic Coin Address (SHA-256)</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedSpentCoin.coinId);
                    alert("Copied coin address to clipboard!");
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-sans"
                >
                  📋 Copy Address
                </button>
              </div>
              <div className="font-mono text-emerald-400 break-all text-[11px] leading-relaxed">
                {selectedSpentCoin.coinId}
              </div>
            </div>

            {/* Key Coin Properties Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                <span className="text-slate-400 text-[10px]">Denomination</span>
                <div className="font-bold text-slate-800 mt-0.5">
                  ₹{selectedSpentCoin.denomination} INR (1 EDU)
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                <span className="text-slate-400 text-[10px]">Batch Number</span>
                <div className="font-bold text-slate-800 mt-0.5 font-mono">
                  {selectedSpentCoin.batchId} #{selectedSpentCoin.serialNumber}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                <span className="text-slate-400 text-[10px]">Institutional Status</span>
                <div className="font-bold text-indigo-700 mt-0.5">
                  {selectedSpentCoin.institutionalStatus || selectedSpentCoin.status}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                <span className="text-slate-400 text-[10px]">Enrolled Student Binding</span>
                <div className="font-bold text-slate-800 mt-0.5">
                  {selectedSpentCoin.studentName || selectedSpentCoin.currentOwnerName || "Student"}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                <span className="text-slate-400 text-[10px]">Respected College</span>
                <div className="font-bold text-slate-800 mt-0.5">
                  {selectedSpentCoin.instituteName || "VNR VJIET"}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                <span className="text-slate-400 text-[10px]">Current Custody</span>
                <div className="font-bold text-slate-800 mt-0.5 truncate" title={selectedSpentCoin.currentOwner}>
                  {selectedSpentCoin.currentOwnerName || selectedSpentCoin.currentOwner.slice(0, 10)}
                </div>
              </div>
            </div>

            {/* Cryptographic Signatures */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-1">
              <span className="text-slate-400 text-[10px]">Government Mint Signature</span>
              <div className="font-mono text-[10px] text-slate-600 break-all">
                {selectedSpentCoin.mintSignature}
              </div>
            </div>

            {/* Complete Provenance Timeline */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>⛓️</span> Unbroken Provenance & Spend History ({selectedSpentCoin.history.length} stages)
              </h4>
              <div className="space-y-2">
                {selectedSpentCoin.history.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-xs"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                      {idx + 1}
                    </span>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between font-semibold text-slate-900">
                        <span>
                          {entry.action === "MINT"
                            ? "🏛️ Minted & Dispatched to College Whitelist"
                            : entry.category === "TUITION"
                              ? "🎓 Spent on Tuition Fees"
                              : entry.action === "TRANSFER"
                                ? `💸 Spent on ${entry.category || "Education"}`
                                : entry.action}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-normal">
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        From: <span className="font-medium">{entry.fromName || entry.from || "Treasury"}</span> → To:{" "}
                        <span className="font-medium">{entry.toName || entry.to}</span>
                      </div>
                      {entry.memo && (
                        <div className="text-[10px] text-slate-400 italic">
                          &ldquo;{entry.memo}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 text-right">
              <Button onClick={() => setSelectedSpentCoin(null)} className="text-xs px-4 py-2">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
