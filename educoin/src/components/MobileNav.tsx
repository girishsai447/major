"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStage } from "@/context/StageContext";
import { NAV } from "./nav";

export function MobileNav() {
  const pathname = usePathname();
  const { enabled, stage } = useStage();
  const items = NAV.filter((n) => (n.feature ? enabled(n.feature) : true));

  return (
    <header
      suppressHydrationWarning
      className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/80 backdrop-blur lg:hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white">
          ₹
        </div>
        <span className="font-bold text-slate-900">EduCoin</span>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          Stage {stage}
        </span>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
