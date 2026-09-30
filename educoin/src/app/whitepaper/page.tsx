"use client";

import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { LockedPage } from "@/components/LockedPage";
import { Card, SectionTitle, Badge } from "@/components/ui";
import { SPENDING_CAPS, CATEGORY_LABELS, type Category } from "@/lib/types";

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-base font-semibold text-slate-800">{children}</h3>;
}

export default function WhitepaperPage() {
  const { enabled } = useStage();
  const { data } = useChainData();

  if (!enabled("whitepaper")) return <LockedPage feature="whitepaper" />;

  const caps = (Object.keys(SPENDING_CAPS) as Category[]).filter(
    (c) => ["TUITION", "EXAMINATION", "HOSTEL", "BOOKS"].includes(c)
  );

  return (
    <div className="space-y-6">
      <SectionTitle icon="📘" title="EduCoin Whitepaper" subtitle="Design, tokenomics and security model of the EduCoin stablecoin." />

      <Card className="p-8 leading-relaxed">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-bold text-white">₹</div>
          <div>
            <div className="text-lg font-bold text-slate-900">EduCoin (EDU) — A Purpose-Bound Educational Stablecoin</div>
            <div className="text-xs text-slate-500">Version 1.0 · Team 6 · Department of CSE</div>
          </div>
          <div className="ml-auto"><Badge color="blue">Academic prototype</Badge></div>
        </div>

        <H>1. Abstract</H>
        <p className="mt-2 text-sm text-slate-600">
          EduCoin is a blockchain-enabled digital currency that restricts government scholarship
          funds to authorized educational purposes. Funds are issued on-chain as a stablecoin
          pegged at ₹100 per EDU and backed by a fully-collateralised INR reserve. A smart
          contract enforces who may transact, for what purpose, and within what limits — while the
          blockchain provides tamper-evident, end-to-end traceability from issuance to utilization.
        </p>

        <H>2. Token model &amp; peg</H>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
          <li>▹ <b>Symbol:</b> EDU. <b>Peg:</b> 1 EDU = ₹100 (fiat-collateralised stablecoin).</li>
          <li>▹ <b>Backing:</b> every circulating EDU is backed by ₹100 of INR in the Government reserve; minting is blocked if it would break the peg.</li>
          <li>▹ <b>Supply:</b> elastic — expands on issuance, contracts on settlement and clawback.</li>
          <li>▹ <b>Fees:</b> none. Scholarship funds are never eroded by transaction fees.</li>
          <li className="mono text-xs text-slate-500">
            Current: reserve ₹{(data?.reserve.reserveINR ?? 0).toLocaleString()} · circulating{" "}
            {(data?.reserve.circulating ?? 0).toLocaleString()} EDU · ratio{" "}
            {Math.round((data?.reserve.collateralRatio ?? 1) * 100)}%
          </li>
        </ul>

        <H>3. Participants</H>
        <p className="mt-2 text-sm text-slate-600">
          Four roles hold cryptographic wallets: the <b>Government Treasury</b> (issuer &amp;
          reserve custodian), <b>Institutions</b> (colleges), <b>Students</b> (beneficiaries) and
          approved <b>Vendors</b>. Addresses are derived by hashing each wallet's Ed25519 public key.
        </p>

        <H>4. Lifecycle</H>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {["Reserve funded", "Issued to student", "Spent on education", "Redeemed for INR", "Unused → reclaimed"].map((s, i, a) => (
            <span key={s} className="flex items-center gap-2">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600">{s}</span>
              {i < a.length - 1 && <span className="text-slate-300">→</span>}
            </span>
          ))}
        </div>

        <H>5. Policy (the smart contract)</H>
        <p className="mt-2 text-sm text-slate-600">
          Ten rules (R1–R10) are enforced on every transaction: registered participants only,
          Government-only issuance, student-initiated spending, authorized recipients, approved
          categories, sufficient balance, positive amounts, per-category caps, validity term, and a
          valid digital signature. Category caps:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {caps.map((c) => (
            <span key={c} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600">
              {CATEGORY_LABELS[c]}: {SPENDING_CAPS[c] === 0 ? "uncapped" : `₹${SPENDING_CAPS[c].toLocaleString()}`}
            </span>
          ))}
        </div>

        <H>6. Security model</H>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
          <li>▹ <b>Integrity:</b> SHA-256 hash-linked blocks + proof-of-work; any edit invalidates the chain.</li>
          <li>▹ <b>Inclusion:</b> a Merkle root commits to each block's transactions; inclusion is provable.</li>
          <li>▹ <b>Authenticity:</b> every transaction carries an Ed25519 signature bound to the sender's wallet.</li>
          <li>▹ <b>Transparency:</b> rejected attempts are permanently recorded in the audit trail.</li>
        </ul>

        <H>7. Limitations &amp; future work</H>
        <p className="mt-2 text-sm text-slate-600">
          This prototype runs the chain and contract natively in TypeScript for a reliable,
          self-contained demonstration. Production deployment would migrate the policy to a Solidity
          contract on a permissioned EVM chain, integrate real bank rails for reserve custody and
          settlement, and add institutional KYC and multi-signature governance.
        </p>

        <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-400">
          © 2026–27 Team 6 — Girish Sai Tipirneni, Ravva Sai Sanjeeth, Siddhartha Brahmanapally,
          Venuturla Jeevan Manikanta Reddy. Supervisor: Dr. Deepak Sukheja.
        </div>
      </Card>
    </div>
  );
}
