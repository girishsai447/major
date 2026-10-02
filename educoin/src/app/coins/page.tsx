"use client";

import { useMemo, useState } from "react";
import { useChainData } from "@/hooks/useChainData";
import { api } from "@/lib/api";
import { Card, SectionTitle, Button, Badge, EDU, Hash, Stat } from "@/components/ui";
import type {
  EduCoinUnit,
  CoinBatch,
  CoinBatchVerificationResult,
} from "@/lib/types";

export default function CoinRegistryPage() {
  const { data, refresh } = useChainData();

  // Selected filter tabs
  const [filterOwner, setFilterOwner] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCoin, setSelectedCoin] = useState<EduCoinUnit | null>(null);

  // Verifier Tool State
  const [verifyMode, setVerifyMode] = useState<"CUSTOM" | "STUDENT1" | "VNR_SETTLE" | "COUNTERFEIT">("STUDENT1");
  const [inputCoinIds, setInputCoinIds] = useState<string>("");
  const [expectedOwnerAddr, setExpectedOwnerAddr] = useState<string>("");
  const [verifyResult, setVerifyResult] = useState<
    (CoinBatchVerificationResult & { simulatedTamperApplied?: boolean }) | null
  >(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  const coins: EduCoinUnit[] = (data?.coins as EduCoinUnit[]) || [];
  const batches: CoinBatch[] = (data?.coinBatches as CoinBatch[]) || [];
  const wallets = data?.wallets ?? [];

  // Helper wallets
  const girishWallet = wallets.find((w) => w.studentId === "STU001");
  const sanjeethWallet = wallets.find((w) => w.studentId === "STU002");
  const vnrWallet = wallets.find((w) => w.role === "INSTITUTION" && w.name.includes("VNR"));
  const treasuryWallet = wallets.find((w) => w.role === "GOVERNMENT");

  // Metrics
  const totalCoins = coins.length;
  const activeCoins = coins.filter((c) => c.status === "ACTIVE").length;
  const redeemedCoins = coins.filter((c) => c.status === "REDEEMED").length;
  const totalValueINR = totalCoins * 100;

  // Filtered coins list
  const filteredCoins = useMemo(() => {
    return coins.filter((coin) => {
      if (filterOwner !== "ALL") {
        if (coin.currentOwner.toLowerCase() !== filterOwner.toLowerCase()) {
          return false;
        }
      }
      if (filterStatus !== "ALL") {
        if (coin.status !== filterStatus) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSerial = coin.displaySerial.toLowerCase().includes(q);
        const matchId = coin.coinId.toLowerCase().includes(q);
        const matchNum = String(coin.serialNumber).includes(q);
        const matchOwner = (coin.currentOwnerName || "").toLowerCase().includes(q);
        if (!matchSerial && !matchId && !matchNum && !matchOwner) return false;
      }
      return true;
    });
  }, [coins, filterOwner, filterStatus, searchQuery]);

  // Distinct students who hold or were issued coins
  const distinctStudents = useMemo(() => {
    const map = new Map<string, { id: string; name: string; institute: string; coinCount: number; coins: EduCoinUnit[] }>();
    coins.forEach((c) => {
      const sId = c.studentId || c.currentOwnerName || "UNKNOWN";
      if (!map.has(sId)) {
        map.set(sId, {
          id: sId,
          name: c.studentName || c.currentOwnerName || sId,
          institute: c.instituteName || "Enrolled Institution",
          coinCount: 0,
          coins: [],
        });
      }
      const entry = map.get(sId)!;
      entry.coinCount++;
      entry.coins.push(c);
    });
    return Array.from(map.values());
  }, [coins]);

  // Dynamic Institutional Ledgers calculated across all coins and registered colleges
  const institutionLedgers = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        students: string[];
        totalDispatched: number;
        preAuthorized: number;
        collectedFee: number;
        redeemed: number;
        coins: EduCoinUnit[];
      }
    >();

    // Seed known institutions from student records
    (data?.students ?? []).forEach((s) => {
      if (!map.has(s.instituteId)) {
        map.set(s.instituteId, {
          id: s.instituteId,
          name: s.instituteName,
          students: [],
          totalDispatched: 0,
          preAuthorized: 0,
          collectedFee: 0,
          redeemed: 0,
          coins: [],
        });
      }
      const entry = map.get(s.instituteId)!;
      if (!entry.students.includes(s.name)) {
        entry.students.push(s.name);
      }
    });

    // Populate and compute actual tallies from the coin database
    coins.forEach((c) => {
      const instId =
        c.instituteId ||
        (c.instituteName?.includes("VNR")
          ? "INST-VNR"
          : c.instituteName?.includes("CBIT")
          ? "INST-CBIT"
          : "INST-GENERAL");
      const instName = c.instituteName || (instId === "INST-VNR" ? "VNR VJIET" : instId === "INST-CBIT" ? "CBIT" : "Partner Institution");

      if (!map.has(instId)) {
        map.set(instId, {
          id: instId,
          name: instName,
          students: [],
          totalDispatched: 0,
          preAuthorized: 0,
          collectedFee: 0,
          redeemed: 0,
          coins: [],
        });
      }
      const entry = map.get(instId)!;
      entry.totalDispatched++;
      entry.coins.push(c);
      if (c.studentName && !entry.students.includes(c.studentName)) {
        entry.students.push(c.studentName);
      }

      if (c.status === "REDEEMED" || c.institutionalStatus === "REDEEMED_AT_BANK") {
        entry.redeemed++;
      } else if (
        c.institutionalStatus === "COLLECTED_AS_FEE" ||
        c.history.some((h) => h.memo?.includes("tuition") || h.memo?.includes("fee"))
      ) {
        entry.collectedFee++;
      } else {
        entry.preAuthorized++;
      }
    });

    return Array.from(map.values());
  }, [coins, data?.students]);

  // Execute verification
  const runVerification = async (
    targetIds: string[],
    owner?: string,
    simulateTamper = false
  ) => {
    if (targetIds.length === 0) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.verifyCoins(targetIds, owner || undefined, simulateTamper);
      setVerifyResult(res);
    } catch (err: unknown) {
      alert("Verification error: " + (err instanceof Error ? err.message : "Network error"));
    } finally {
      setVerifying(false);
    }
  };

  // Preset button handlers
  const handleSelectStudentAudit = (studentId: string) => {
    setVerifyMode("CUSTOM");
    const stu = distinctStudents.find((s) => s.id === studentId);
    if (!stu || stu.coins.length === 0) return;
    const ids = stu.coins.map((c) => c.coinId);
    const targetOwner = stu.coins[0]?.currentOwner || "";
    setInputCoinIds(ids.join("\n"));
    setExpectedOwnerAddr(targetOwner);
    runVerification(ids, targetOwner);
  };

  const handleSelectInstitutionAudit = (instId: string) => {
    setVerifyMode("CUSTOM");
    const inst = institutionLedgers.find((i) => i.id === instId);
    if (!inst || inst.coins.length === 0) return;
    const ids = inst.coins.map((c) => c.coinId);
    setInputCoinIds(ids.join("\n"));
    setExpectedOwnerAddr("");
    runVerification(ids);
  };

  const handleVerifyStudent1 = () => {
    setVerifyMode("STUDENT1");
    // Coins 1 to 50 (e.g. Girish Sai Tipirneni STU001)
    const s1Coins = coins.slice(0, 50);
    const ids = s1Coins.map((c) => c.coinId);
    setInputCoinIds(ids.join("\n"));
    setExpectedOwnerAddr(girishWallet?.address || "");
    runVerification(ids, girishWallet?.address);
  };

  const handleVerifyVNRRedeemed = () => {
    setVerifyMode("VNR_SETTLE");
    // Redeemed coins (e.g. Coins 1 to 20 settled by VNR)
    const redeemed = coins.filter((c) => c.status === "REDEEMED");
    const ids = redeemed.length ? redeemed.slice(0, 20).map((c) => c.coinId) : coins.slice(0, 20).map((c) => c.coinId);
    setInputCoinIds(ids.join("\n"));
    setExpectedOwnerAddr(vnrWallet?.address || "");
    runVerification(ids, vnrWallet?.address);
  };

  const handleTestCounterfeit = () => {
    setVerifyMode("COUNTERFEIT");
    // Take 5 valid coins and simulate counterfeit injection
    const valid5 = coins.slice(0, 5).map((c) => c.coinId);
    setInputCoinIds(valid5.join("\n"));
    setExpectedOwnerAddr(girishWallet?.address || "");
    runVerification(valid5, girishWallet?.address, true);
  };

  const handleCustomVerify = () => {
    const raw = inputCoinIds
      .split(/[\n, ]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (raw.length === 0) {
      alert("Please paste at least one Coin ID.");
      return;
    }
    runVerification(raw, expectedOwnerAddr || undefined);
  };

  return (
    <div className="space-y-6">
      {/* Title & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionTitle
          icon="💎"
          title="Serialized Coin Registry & Verification Engine"
          subtitle="Every EduCoin is an individually identifiable, cryptographically signed digital banknote (1 EDU = ₹100 INR fixed peg). Prevent counterfeit coins, verify ownership, audit unbroken provenance, and simulate institution & bank settlements."
        />
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            🔒 7-Point Cryptographic Audit
          </span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            📜 1 EDU = ₹100 INR Fixed Peg
          </span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Minted Coins" value={`${totalCoins} Coins`} accent="#6366f1" />
        <Stat label="Total Reserve Value" value={`₹${totalValueINR.toLocaleString()} INR`} accent="#10b981" />
        <Stat label="Active in Wallets" value={`${activeCoins} Coins`} accent="#0ea5e9" />
        <Stat label="Settled / Redeemed" value={`${redeemedCoins} Coins`} accent="#f59e0b" />
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: 7-Point Cryptographic Batch Verifier (For Colleges & Bank)      */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Card className="p-6 border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🛡️</span> Institutional & Bank Pre-Flight Verification Tool
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate any enrolled institution (e.g. <strong>VNR VJIET</strong>, <strong>CBIT</strong>) cross-checking presented coin addresses before fee acceptance, or the <strong>Bank</strong> verifying redeemed coins before disbursing real INR.
            </p>
          </div>

          {/* Quick Scenario Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleVerifyStudent1}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                verifyMode === "STUDENT1"
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
              }`}
            >
              🎓 Example: Student 1 (Coins 1–50)
            </button>
            <button
              onClick={() => {
                setVerifyMode("CUSTOM");
                const s2Coins = coins.slice(50, 100);
                const ids = s2Coins.map((c) => c.coinId);
                setInputCoinIds(ids.join("\n"));
                setExpectedOwnerAddr(sanjeethWallet?.address || "");
                runVerification(ids, sanjeethWallet?.address);
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
            >
              🎓 Example: Student 2 (Coins 51–100)
            </button>
            <button
              onClick={handleVerifyVNRRedeemed}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                verifyMode === "VNR_SETTLE"
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
              }`}
            >
              🏦 Bank Settlement (Coins 1–20)
            </button>
            <button
              onClick={handleTestCounterfeit}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                verifyMode === "COUNTERFEIT"
                  ? "bg-rose-600 text-white shadow"
                  : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
              }`}
            >
              🚨 Inject Counterfeit Coin (Attack Test)
            </button>
          </div>
        </div>

        {/* Dynamic Selectors Toolbar */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 rounded-xl bg-indigo-50/50 p-3 border border-indigo-100">
          <div>
            <label className="block text-xs font-semibold text-indigo-900 mb-1">
              🎓 Audit Any Student Issuance (Dynamic)
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) handleSelectStudentAudit(e.target.value);
              }}
              defaultValue=""
              className="w-full rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
            >
              <option value="">-- Choose Any Student to Audit Minted Coins --</option>
              {distinctStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id}) — {s.coinCount} Coins ({s.institute})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-indigo-900 mb-1">
              🏛️ Audit College Pre-Registered Whitelist (Dynamic)
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) handleSelectInstitutionAudit(e.target.value);
              }}
              defaultValue=""
              className="w-full rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
            >
              <option value="">-- Choose Any College to Audit Dispatched Whitelist --</option>
              {institutionLedgers.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.id}) — {inst.totalDispatched} Dispatched Coin Addresses
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Verification Form Inputs */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-2">
            <label className="block text-xs font-medium text-slate-600">
              Coin Identifiers to Audit (One hash per line or comma-separated)
            </label>
            <textarea
              rows={3}
              value={inputCoinIds}
              onChange={(e) => {
                setInputCoinIds(e.target.value);
                setVerifyMode("CUSTOM");
              }}
              placeholder="e.g. 0x8a9f... Paste 1 or 50 coin IDs"
              className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs text-slate-800 outline-none focus:border-indigo-400 bg-white"
            />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                {inputCoinIds ? inputCoinIds.split(/[\n, ]+/).filter(Boolean).length : 0} Coin IDs loaded
              </span>
              <button
                onClick={() => {
                  setInputCoinIds(coins.map((c) => c.coinId).join("\n"));
                  setVerifyMode("CUSTOM");
                }}
                className="text-indigo-600 hover:underline"
              >
                Load all {coins.length} minted coins
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Expected Presenter Wallet (Optional)
              </label>
              <select
                value={expectedOwnerAddr}
                onChange={(e) => setExpectedOwnerAddr(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-400 bg-white"
              >
                <option value="">Any Registered Participant</option>
                {wallets.map((w) => (
                  <option key={w.address} value={w.address}>
                    {w.name} ({w.role})
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleCustomVerify}
              disabled={verifying}
              className="w-full justify-center bg-indigo-600 text-white hover:bg-indigo-700 py-2.5 shadow-sm"
            >
              {verifying ? "Auditing..." : "🔍 Run 7-Point Cryptographic Verification"}
            </Button>
          </div>
        </div>

        {/* Verification Result Card */}
        {verifyResult && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                  verifyResult.allValid ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                }`}>
                  {verifyResult.allValid ? "✓" : "✗"}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {verifyResult.allValid
                      ? `Cryptographic Validation Passed: All ${verifyResult.totalChecked} Coins Verified Authentic`
                      : `Validation Rejected: Counterfeit, Spent, or Invalid Coins Detected`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Inspected {verifyResult.totalChecked} units · Total Value: ₹{verifyResult.totalValueINR.toLocaleString()} INR (Peg: 1 EDU = ₹100)
                  </p>
                </div>
              </div>

              {verifyResult.simulatedTamperApplied && (
                <span className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-200 animate-pulse">
                  ⚠️ Simulated Counterfeit Injection Triggered
                </span>
              )}
            </div>

            {/* The 7-Rule Breakdown Checklist */}
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {verifyResult.checks.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-xl border p-3 text-xs ${
                    c.passed
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-rose-200 bg-rose-50/60"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className={c.passed ? "text-emerald-700" : "text-rose-700"}>
                      {c.passed ? "✓" : "✗"}
                    </span>
                    <span className="text-slate-700">{c.id}: {c.ruleName}</span>
                  </div>
                  <p className={`mt-1 ${c.passed ? "text-slate-600" : "text-rose-700 font-medium"}`}>
                    {c.details}
                  </p>
                </div>
              ))}
            </div>

            {/* Individual inspected coins table */}
            <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Serial</th>
                    <th className="px-3 py-2">Coin ID Hash</th>
                    <th className="px-3 py-2">Batch</th>
                    <th className="px-3 py-2">Current Owner</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {verifyResult.coins.map((c, idx) => (
                    <tr key={idx} className={c.valid ? "hover:bg-slate-50" : "bg-rose-50/40"}>
                      <td className="px-3 py-1.5 font-bold text-slate-800">{c.displaySerial}</td>
                      <td className="px-3 py-1.5 text-slate-500 text-[11px]">
                        {c.coinId.slice(0, 14)}...{c.coinId.slice(-6)}
                      </td>
                      <td className="px-3 py-1.5 text-slate-600">{c.batchId}</td>
                      <td className="px-3 py-1.5 font-sans text-slate-700">
                        {c.currentOwnerName || c.currentOwner.slice(0, 10)}
                      </td>
                      <td className="px-3 py-1.5 font-sans">
                        <Badge
                          color={
                            c.status === "ACTIVE"
                              ? "green"
                              : c.status === "REDEEMED"
                              ? "amber"
                              : "red"
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5 font-sans">
                        {c.valid ? (
                          <span className="text-emerald-600 font-semibold">✓ Genuine</span>
                        ) : (
                          <span className="text-rose-600 font-semibold">{c.failureReason || "Failed"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1B: Institutional Pre-Registered Ledgers (College Fee Whitelist)   */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Card className="p-6 border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🏛️</span> Institutional Pre-Authorized Ledgers (College Fee Whitelists)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              When the Government mints scholarship coins for <strong>any student</strong> (e.g. 50 coins), each individual coin address (from 1 to N) is immediately dispatched and registered to the student&apos;s enrolled institution. When students pay fees, the college cross-checks this dispatched list to guarantee zero duplication!
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
            Zero-Duplication Guaranteed
          </span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {institutionLedgers.map((inst) => (
            <div
              key={inst.id}
              className={`rounded-2xl border p-4 ${
                inst.id === "INST-VNR"
                  ? "border-indigo-200 bg-indigo-50/30"
                  : "border-slate-200 bg-slate-50/50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {inst.name} ({inst.id})
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Enrolled Students:{" "}
                    <b>{inst.students.length > 0 ? inst.students.join(", ") : "Awaiting student registration"}</b>
                  </div>
                </div>
                <Badge color={inst.id === "INST-VNR" ? "blue" : "slate"}>
                  {inst.id === "INST-VNR" ? "Primary Partner" : "Affiliated College"}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-white p-2 border border-indigo-100">
                  <div className="text-slate-400 text-[10px]">Pre-Authorized</div>
                  <div className="font-bold text-indigo-600 mt-0.5 font-mono">{inst.preAuthorized} Coins</div>
                </div>
                <div className="rounded-xl bg-white p-2 border border-emerald-100">
                  <div className="text-slate-400 text-[10px]">Collected As Fee</div>
                  <div className="font-bold text-emerald-600 mt-0.5 font-mono">{inst.collectedFee} Coins</div>
                </div>
                <div className="rounded-xl bg-white p-2 border border-amber-100">
                  <div className="text-slate-400 text-[10px]">Bank Redeemed</div>
                  <div className="font-bold text-amber-600 mt-0.5 font-mono">{inst.redeemed} Coins</div>
                </div>
              </div>

              <div className="mt-3 text-xs text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                <span className="font-semibold text-indigo-900">Official Dispatched Whitelist:</span>{" "}
                {inst.totalDispatched > 0
                  ? `${inst.totalDispatched} individual coin addresses cryptographically dispatched and registered to ${inst.name} at mint time. Double-spending or presentation by foreign college students is strictly prevented.`
                  : "No coins dispatched yet. Mint a scholarship in the Issue Scholarship portal to register coin addresses."}
              </div>

              <div className="mt-3 flex justify-between items-center pt-1">
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <span>✓</span> Whitelist Active
                </span>
                {inst.totalDispatched > 0 && (
                  <button
                    onClick={() => {
                      const ids = inst.coins.map((c) => c.coinId);
                      setInputCoinIds(ids.join("\n"));
                      setExpectedOwnerAddr("");
                      runVerification(ids);
                      window.scrollTo({ top: 120, behavior: "smooth" });
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Audit {inst.name}&apos;s Whitelist ({inst.totalDispatched} Coins) ↑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: Serialized Banknote Gallery & Provenance Inspector              */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>💵</span> Serialized Coin Registry (Banknote Gallery)
            </h2>
            <p className="text-xs text-slate-500">
              Browse each individual EduCoin unit, inspect its cryptographic mint certificate, and trace its exact chain of custody.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search serial, coin ID, student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-indigo-400 bg-white min-w-[220px]"
            />

            <select
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-indigo-400 bg-white"
            >
              <option value="ALL">All Owners</option>
              {wallets.map((w) => (
                <option key={w.address} value={w.address}>
                  {w.name} ({w.role})
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-indigo-400 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE (Unspent)</option>
              <option value="REDEEMED">REDEEMED (Settled for INR)</option>
              <option value="FROZEN">FROZEN</option>
            </select>
          </div>
        </div>

        {/* Quick Batch Summary Bar */}
        {batches.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">🏛️ Genesis Batch #1:</span>
              <span>100 EduCoins Minted (₹10,000 INR)</span>
              <span>·</span>
              <span className="font-mono text-slate-500">
                Merkle Root: {batches[0].merkleRoot.slice(0, 16)}...
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-600 font-semibold">
                Student 1 (Coins 1–50)
              </span>
              <span>|</span>
              <span className="text-indigo-600 font-semibold">
                Student 2 (Coins 51–100)
              </span>
            </div>
          </div>
        )}

        {/* Coin Cards Grid */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredCoins.map((coin) => (
            <div
              key={coin.coinId}
              onClick={() => setSelectedCoin(coin)}
              className={`cursor-pointer rounded-2xl border p-4 transition-all hover:shadow-md ${
                coin.status === "ACTIVE"
                  ? "border-emerald-200 bg-gradient-to-b from-emerald-50/40 via-white to-white hover:border-emerald-400"
                  : coin.status === "REDEEMED"
                  ? "border-amber-200 bg-gradient-to-b from-amber-50/30 via-white to-white hover:border-amber-400 opacity-90"
                  : "border-slate-200 bg-white"
              }`}
            >
              {/* Header: Serial & Value */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-slate-800">
                    {coin.displaySerial}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Batch #{coin.batchId} · Coin #{coin.serialNumber}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-emerald-600">
                    ₹{coin.denomination}
                  </div>
                  <span className="text-[10px] text-slate-400">1 EDU</span>
                </div>
              </div>

              {/* Status & Owner Badge */}
              <div className="mt-3 flex items-center justify-between text-xs">
                <Badge
                  color={
                    coin.status === "ACTIVE"
                      ? "green"
                      : coin.status === "REDEEMED"
                      ? "amber"
                      : "red"
                  }
                >
                  {coin.status}
                </Badge>
                <span className="text-[11px] text-slate-600 font-medium truncate max-w-[130px]">
                  {coin.currentOwnerName || coin.currentOwner.slice(0, 10)}
                </span>
              </div>

              {/* Cryptographic ID snippet */}
              <div className="mt-3 rounded-lg bg-slate-50 px-2 py-1.5 font-mono text-[10px] text-slate-500 truncate border border-slate-100">
                CID: {coin.coinId}
              </div>

              {/* Footer: Provenance hops */}
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                <span>{coin.history.length} lifecycle events</span>
                <span className="text-indigo-600 hover:underline">View History →</span>
              </div>
            </div>
          ))}
        </div>

        {filteredCoins.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-400 bg-white rounded-2xl border border-slate-200">
            No coins matching the selected filters.
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: Individual Coin Provenance & Certificate Viewer                     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {selectedCoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 font-mono">
                    {selectedCoin.displaySerial}
                  </h3>
                  <Badge
                    color={
                      selectedCoin.status === "ACTIVE"
                        ? "green"
                        : selectedCoin.status === "REDEEMED"
                        ? "amber"
                        : "red"
                    }
                  >
                    {selectedCoin.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Batch: {selectedCoin.batchId} · Serial: #{selectedCoin.serialNumber} · Fixed Face Value: ₹{selectedCoin.denomination} INR (1 EDU)
                </p>
              </div>
              <button
                onClick={() => setSelectedCoin(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Cryptographic Specifications */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1.5 font-mono">
                <div className="text-[11px] font-bold text-slate-700">Cryptographic Identity (SHA-256):</div>
                <div className="break-all text-[11px] text-indigo-700 bg-white p-2 rounded-lg border border-slate-200">
                  {selectedCoin.coinId}
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  <strong>Authorized Issuer:</strong> {selectedCoin.issuer}
                </div>
                <div className="text-[11px] text-slate-500">
                  <strong>Mint Timestamp:</strong> {new Date(selectedCoin.mintedAt).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 break-all">
                  <strong>Treasury Signature:</strong> {selectedCoin.mintSignature.slice(0, 32)}...
                </div>
              </div>
            </div>

            {/* Unbroken Lifecycle Provenance Trail */}
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Unbroken Chain of Custody & Provenance
              </h4>
              <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {selectedCoin.history.map((entry, idx) => (
                  <div key={idx} className="relative flex items-start gap-3 pl-1">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold z-10">
                      {idx + 1}
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs w-full">
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>{entry.action}: {entry.memo || "Transaction event"}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        <strong>From:</strong> {entry.fromName || entry.from || "Genesis Vault"}{" "}
                        → <strong>To:</strong> {entry.toName || entry.to}
                      </div>
                      {entry.txId && (
                        <div className="mt-1 text-[10px] font-mono text-slate-400 truncate">
                          Tx Hash: {entry.txId}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button
                onClick={() => {
                  setInputCoinIds(selectedCoin.coinId);
                  setExpectedOwnerAddr(selectedCoin.currentOwner);
                  setSelectedCoin(null);
                  runVerification([selectedCoin.coinId], selectedCoin.currentOwner);
                }}
                className="bg-indigo-600 text-white text-xs hover:bg-indigo-700"
              >
                Audit this Coin in Verifier
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedCoin(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
