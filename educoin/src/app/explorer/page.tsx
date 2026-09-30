"use client";

import { useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { api } from "@/lib/api";
import { LockedPage } from "@/components/LockedPage";
import {
  Card,
  SectionTitle,
  Button,
  Hash,
  Badge,
  Stat,
  Spinner,
  StatusBadge,
  CategoryBadge,
  Empty,
} from "@/components/ui";
import { BlockchainLab } from "@/components/BlockchainLab";

export default function ExplorerPage() {
  const { enabled } = useStage();
  const { data, loading, refresh } = useChainData();
  const [mining, setMining] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  if (!enabled("blockchain.explorer")) return <LockedPage feature="blockchain.explorer" />;

  const mine = async () => {
    setMining(true);
    try {
      const res = await api.mine();
      if (res.block) {
        setFlash(`⛏️ Block mined in ${res.ms} ms after ${res.hashes?.toLocaleString()} hashes.`);
      } else {
        setFlash(res.error || "Nothing to mine.");
      }
      await refresh();
      setTimeout(() => setFlash(null), 4000);
    } finally {
      setMining(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        icon="🔗"
        title="Block Explorer"
        subtitle="The hash-linked EduCoin ledger. Every block is sealed by proof-of-work and cryptographically chained to the previous one."
        right={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refresh()}>
              ↻ Validate chain
            </Button>
            <Button onClick={mine} disabled={mining || (data?.meta.mempoolSize ?? 0) === 0}>
              {mining ? "Mining…" : `⛏️ Mine ${data?.meta.mempoolSize ?? 0} pending`}
            </Button>
          </div>
        }
      />

      {flash && (
        <div className="animate-fade-in rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-700">
          {flash}
        </div>
      )}

      {/* Chain summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Block height" value={data?.meta.height ?? "—"} />
        <Stat label="Difficulty" value={data?.meta.difficulty ?? "—"} hint="leading zeros required" />
        <Stat label="Pending (mempool)" value={data?.meta.mempoolSize ?? "—"} accent="#f59e0b" />
        <Stat
          label="Integrity"
          value={data ? (data.integrity.valid ? "✔ Valid" : "✗ Broken") : "—"}
          accent={data?.integrity.valid ? "#10b981" : "#e11d48"}
          hint={`${data?.integrity.blocksChecked ?? 0} blocks verified`}
        />
      </div>

      {data && !data.integrity.valid && (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <b>Tampering detected:</b>
          <ul className="mt-1 list-disc pl-5">
            {data.integrity.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Card>
      )}

      <BlockchainLab />

      {loading && <Spinner label="Loading chain…" />}

      {/* Blocks */}
      <div className="space-y-3">
        {data?.chain
          .slice()
          .reverse()
          .map((block) => (
            <Card key={block.index} className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-slate-50/60 px-5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
                  #{block.index}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    {block.index === 0 ? "Genesis Block" : `Block ${block.index}`}
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(block.timestamp).toLocaleString()} · mined by {block.minedBy}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Badge color="slate">nonce {block.nonce.toLocaleString()}</Badge>
                  <Badge color="green">PoW ✓</Badge>
                </div>
              </div>

              <div className="grid gap-3 px-5 py-3 sm:grid-cols-2">
                <div className="text-xs">
                  <span className="text-slate-400">Hash</span>
                  <div className="mt-1">
                    <Hash value={block.hash} chars={16} />
                  </div>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400">Previous hash</span>
                  <div className="mt-1">
                    <Hash value={block.previousHash} chars={16} />
                  </div>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400">Merkle root</span>
                  <div className="mt-1">
                    <Hash value={block.merkleRoot} chars={16} />
                  </div>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400">Proof-of-work</span>
                  <div className="mt-1 mono text-slate-500">
                    difficulty {block.difficulty} · nonce {block.nonce.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="px-5 pb-4">
                <div className="mb-1.5 text-xs font-medium text-slate-400">
                  {block.transactions.length} transaction
                  {block.transactions.length === 1 ? "" : "s"}
                </div>
                {block.transactions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">
                    No transactions in this block.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-400">
                        <tr>
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium">From → To</th>
                          <th className="px-3 py-2 font-medium">Amount</th>
                          <th className="px-3 py-2 font-medium">Purpose</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {block.transactions.map((tx) => (
                          <tr key={tx.id} className="border-t border-[var(--border)]">
                            <td className="px-3 py-2">
                              <Badge color={tx.type === "MINT" ? "green" : "blue"}>{tx.type}</Badge>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                {tx.from ? <Hash value={tx.from} chars={5} /> : <span className="text-slate-400">Treasury</span>}
                                <span className="text-slate-300">→</span>
                                <Hash value={tx.to} chars={5} />
                              </div>
                            </td>
                            <td className="mono px-3 py-2 font-medium">{tx.amount.toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <CategoryBadge category={tx.category} />
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge status={tx.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          ))}
        {data && data.chain.length === 0 && <Empty>No blocks yet.</Empty>}
      </div>
    </div>
  );
}
