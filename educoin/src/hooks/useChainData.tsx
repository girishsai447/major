"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Snapshot } from "@/lib/serialize";

interface ChainDataValue {
  data: Snapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const ChainDataContext = createContext<ChainDataValue | null>(null);

export function ChainDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const snap = await api.chain();
      setData(snap);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ChainDataContext.Provider value={{ data, loading, error, refresh }}>
      {children}
    </ChainDataContext.Provider>
  );
}

export function useChainData(): ChainDataValue {
  const ctx = useContext(ChainDataContext);
  if (!ctx) throw new Error("useChainData must be used within <ChainDataProvider>");
  return ctx;
}
