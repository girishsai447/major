"use client";

import { StageProvider } from "@/context/StageContext";
import { ChainDataProvider } from "@/hooks/useChainData";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { DevToolbar } from "./DevToolbar";
import { DemoOverlay } from "./DemoOverlay";
import { Stage5Bar } from "./Stage5Bar";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <StageProvider>
      <ChainDataProvider>
        <DemoOverlay />
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileNav />
            <Stage5Bar />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8">
              {children}
            </main>
          </div>
        </div>
        <DevToolbar />
      </ChainDataProvider>
    </StageProvider>
  );
}
