"use client";

import { useMemo, useState } from "react";
import { useStage } from "@/context/StageContext";
import { useChainData } from "@/hooks/useChainData";
import { api, type MerkleProofResponse } from "@/lib/api";
import { Card, Button, Hash, Badge } from "./ui";

/**
 * Stage-1 interactive lab: prove a transaction is in a block (Merkle proof) and
 * demonstrate tamper-evidence by editing a mined block and watching the chain
 * break. Both are cornerstone blockchain concepts, made tangible for the viva.
 */
export function BlockchainLab() {
  const { enabled } = useStage();
  const { data, refresh } = useChainData();
  const [blockIdx, setBlockIdx] = useState(1);
  const [txIdx, setTxIdx] = useState(0);
  const [proof, setProof] = useState<MerkleProofResponse | null>(null);
  const [tamperMsg, setTamperMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const blocksWithTx = useMemo(
    () => (data?.chain ?? []).filter((b) => b.transactions.length > 0),
    [data]
  );

  if (!enabled("blockchain.merkle") && !enabled("blockchain.tamperLab")) return null;

  const selectedBlock = data?.chain[blockIdx];
  const txCount = selectedBlock?.transactions.length ?? 0;

  const getProof = async () => {
    setBusy(true);
    setProof(null);
    try {
      const res = await api.merkleProof(blockIdx, txIdx);
      setProof(res);
    } catch (e) {
      setTamperMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const tamper = async () => {
    setBusy(true);
    setTamperMsg(null);
    try {
      const res = await api.tamper(blockIdx, txIdx);
      const t = res.tampered as { before: number; after: number };
      setTamperMsg(
        `🧪 Changed block #${blockIdx} tx #${txIdx} amount ${t.before} → ${t.after}. Re-validate the chain above — it now reports tampering.`
      );
      await refresh();
    } catch (e) {
      setTamperMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-800">🔬 Blockchain Lab</span>
        <Badge color="violet">Stage 1</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-[160px_160px_1fr]">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Block</label>
          <select
            value={blockIdx}
            onChange={(e) => {
              setBlockIdx(Number(e.target.value));
              setTxIdx(0);
              setProof(null);
            }}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            {blocksWithTx.map((b) => (
              <option key={b.index} value={b.index}>
                Block #{b.index} ({b.transactions.length} tx)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Transaction</label>
          <select
            value={txIdx}
            onChange={(e) => {
              setTxIdx(Number(e.target.value));
              setProof(null);
            }}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            {Array.from({ length: txCount }).map((_, i) => (
              <option key={i} value={i}>
                tx #{i}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          {enabled("blockchain.merkle") && (
            <Button variant="outline" onClick={getProof} disabled={busy || txCount === 0}>
              🧾 Merkle proof
            </Button>
          )}
          {enabled("blockchain.tamperLab") && (
            <Button variant="danger" onClick={tamper} disabled={busy || txCount === 0}>
              🧪 Tamper block
            </Button>
          )}
        </div>
      </div>

      {proof && (
        <div className="mt-4 rounded-xl border border-slate-100 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
            Merkle inclusion proof
            <Badge color={proof.valid ? "green" : "red"}>{proof.valid ? "✓ verified" : "✗ invalid"}</Badge>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-24 text-slate-400">Leaf (tx hash)</span>
              <Hash value={proof.leaf} chars={14} />
            </div>
            {proof.siblings.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-24 text-slate-400">Sibling {i + 1} ({s.position})</span>
                <Hash value={s.hash} chars={14} />
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <span className="w-24 font-medium text-slate-500">Merkle root</span>
              <Hash value={proof.merkleRoot} chars={14} />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Hashing the leaf with each sibling up the tree reproduces the block's Merkle root —
            proving this transaction is included, without revealing the others.
          </p>
        </div>
      )}

      {tamperMsg && (
        <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">{tamperMsg}</div>
      )}
    </Card>
  );
}
