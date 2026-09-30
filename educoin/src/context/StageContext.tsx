"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CURRENT_STAGE, DEMO_MODE, type Stage } from "@/config/stage";
import { isFeatureEnabled } from "@/config/features";
import type { FeatureKey } from "@/config/features";

/**
 * Client-side stage state.
 *
 * Initialises from the compile-time constants in config/stage.ts (the value you
 * edit for your professor). A hidden developer toolbar and the secret "DEMO"
 * key sequence can override the stage / demo flag at runtime for convenience —
 * the effective stage is also forwarded to the API so contract enforcement
 * stays perfectly in sync with what the UI is showing.
 */

interface StageContextValue {
  stage: Stage;
  demoMode: boolean;
  setStage: (s: Stage) => void;
  toggleDemo: () => void;
  enabled: (feature: FeatureKey) => boolean;
  resetToCode: () => void;
  overridden: boolean;
}

const StageContext = createContext<StageContextValue | null>(null);

const LS_STAGE = "educoin.stage";
const LS_DEMO = "educoin.demo";

export function StageProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStageState] = useState<Stage>(CURRENT_STAGE);
  const [demoMode, setDemoMode] = useState<boolean>(DEMO_MODE);
  const [overridden, setOverridden] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load any runtime override after mount (avoids hydration mismatch).
  useEffect(() => {
    try {
      const s = localStorage.getItem(LS_STAGE);
      const d = localStorage.getItem(LS_DEMO);
      if (s) {
        const n = Number(s) as Stage;
        if (n >= 1 && n <= 5) {
          setStageState(n);
          setOverridden(n !== CURRENT_STAGE);
        }
      }
      if (d !== null) setDemoMode(d === "true");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Keep the effective stage on <html> and in a cookie so the server API can read it.
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.stage = String(stage);
    document.cookie = `educoin_stage=${stage};path=/;max-age=86400;samesite=lax`;
  }, [stage, hydrated]);

  const setStage = useCallback((s: Stage) => {
    setStageState(s);
    setOverridden(s !== CURRENT_STAGE);
    try {
      localStorage.setItem(LS_STAGE, String(s));
    } catch {}
  }, []);

  const toggleDemo = useCallback(() => {
    setDemoMode((d) => {
      const next = !d;
      try {
        localStorage.setItem(LS_DEMO, String(next));
      } catch {}
      return next;
    });
  }, []);

  const resetToCode = useCallback(() => {
    setStageState(CURRENT_STAGE);
    setDemoMode(DEMO_MODE);
    setOverridden(false);
    try {
      localStorage.removeItem(LS_STAGE);
      localStorage.removeItem(LS_DEMO);
    } catch {}
  }, []);

  // Secret "DEMO" key sequence toggles Demo Mode from any page.
  useEffect(() => {
    let buf = "";
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      buf = (buf + e.key.toLowerCase()).slice(-4);
      if (buf === "demo") toggleDemo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleDemo]);

  const enabled = useCallback(
    (feature: FeatureKey) => isFeatureEnabled(feature, stage),
    [stage]
  );

  const value = useMemo(
    () => ({ stage, demoMode, setStage, toggleDemo, enabled, resetToCode, overridden }),
    [stage, demoMode, setStage, toggleDemo, enabled, resetToCode, overridden]
  );

  return <StageContext.Provider value={value}>{children}</StageContext.Provider>;
}

export function useStage(): StageContextValue {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error("useStage must be used within <StageProvider>");
  return ctx;
}
