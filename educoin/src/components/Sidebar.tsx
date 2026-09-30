"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStage } from "@/context/StageContext";
import { NAV, NAV_GROUP_ORDER } from "./nav";
import { FEATURE_STAGE } from "@/config/stage";

export function Sidebar() {
  const pathname = usePathname();
  const { enabled, stage } = useStage();

  return (
    <aside
      suppressHydrationWarning
      className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-white/70 lg:flex lg:flex-col"
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white shadow">
          ₹
        </div>
        <div>
          <div className="text-[15px] font-bold leading-tight text-slate-900">EduCoin</div>
          <div className="text-[11px] text-slate-400">Scholarship Blockchain</div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {NAV_GROUP_ORDER.map((group) => {
          const items = NAV.filter((n) => n.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group}>
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const unlocked = item.feature ? enabled(item.feature) : true;
                  const active = pathname === item.href;
                  const unlockStage = item.feature ? FEATURE_STAGE[item.feature] : 1;

                  if (!unlocked) {
                    return (
                      <div
                        key={item.href}
                        title={`Unlocks in Stage ${unlockStage}`}
                        className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300"
                      >
                        <span className="opacity-40">{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                          🔒 S{unlockStage}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] px-5 py-3 text-[11px] text-slate-400">
        Viewing <span className="font-semibold text-slate-600">Stage {stage}</span> · Team 6
      </div>
    </aside>
  );
}
