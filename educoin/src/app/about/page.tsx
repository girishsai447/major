"use client";

import { Card, SectionTitle, Badge } from "@/components/ui";

const TEAM = [
  ["Girish Sai Tipirneni", "23071A05P4"],
  ["Ravva Sai Sanjeeth", "23071A05T9"],
  ["Siddhartha Brahmanapally", "23071A05U3"],
  ["Venuturla Jeevan Manikanta Reddy", "23071A05U9"],
];

const STACK = [
  ["Next.js (App Router)", "React UI + API routes in one project"],
  ["TypeScript", "End-to-end type safety"],
  ["Custom blockchain", "SHA-256, proof-of-work, hash-linked blocks"],
  ["Rule-engine smart contract", "Deterministic policy enforcement"],
  ["Tailwind CSS", "Styling & design system"],
  ["JSON persistence", "Chain state survives restarts"],
];

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        icon="ℹ️"
        title="About this project"
        subtitle="Design and Implementation of a Stable Cryptocurrency for a Sector-Specific Requirement."
      />

      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-800">Problem</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Government scholarship funds, once transferred to a student's regular bank account, become
          ordinary currency that can be freely withdrawn or spent on non-educational activities. It
          is difficult to ensure the money is used for its intended purposes — tuition, examination
          and hostel fees.
        </p>
        <h3 className="mt-5 text-base font-semibold text-slate-800">Solution — EduCoin</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          A blockchain-enabled digital currency issued and managed on-chain. A smart contract defines
          and enforces the boundaries of its use — authorized participants, permitted transfers and
          approved educational purposes. Transactions outside these rules are automatically rejected,
          and every rupee is traceable from issuance to utilization.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-base font-semibold text-slate-800">Team 6</h3>
          <div className="mt-3 space-y-2">
            {TEAM.map(([name, roll]) => (
              <div key={roll} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm font-medium text-slate-700">{name}</span>
                <span className="mono text-xs text-slate-400">{roll}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
            <span className="text-xs uppercase tracking-wide text-slate-400">Supervisor</span>
            <div className="mt-0.5 font-medium">Dr. Deepak Sukheja</div>
            <div className="text-xs text-slate-500">Associate Professor, Dept. of CSE</div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-semibold text-slate-800">Technology</h3>
          <div className="mt-3 space-y-2">
            {STACK.map(([name, desc]) => (
              <div key={name} className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="text-sm font-medium text-slate-700">{name}</div>
                <div className="text-xs text-slate-500">{desc}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div className="text-sm text-amber-800">
            <b>Prototype note.</b> To keep the demonstration self-contained and reliable, the
            blockchain and smart contract are implemented natively in TypeScript rather than on a
            public testnet. The data structures (SHA-256 hashing, proof-of-work, hash-linked blocks)
            and the policy enforcement mirror how an equivalent Solidity contract on an EVM chain
            would behave — the concepts and guarantees are identical.
            <div className="mt-2">
              <Badge color="amber">Academic prototype · 2026–27</Badge>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
