"use client";

import React from "react";
import { CATEGORY_LABELS, ROLE_LABELS, type Category, type Role } from "@/lib/types";

export function Card({
  children,
  className = "",
  as: Tag = "div",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  style?: React.CSSProperties;
}) {
  return (
    <Tag
      style={style}
      className={`rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ${className}`}
    >
      {children}
    </Tag>
  );
}

export function SectionTitle({
  title,
  subtitle,
  right,
  icon,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  icon?: string;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
          {icon && <span aria-hidden>{icon}</span>}
          {title}
        </h2>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  accent = "#1b6ff5",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold" style={{ color: accent }}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </Card>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger" | "success";
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300 shadow-sm",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300",
    danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-slate-300",
    outline:
      "border border-[var(--border)] bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  color = "slate",
}: {
  children: React.ReactNode;
  color?: "slate" | "green" | "red" | "blue" | "amber" | "violet";
}) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-rose-100 text-rose-700",
    blue: "bg-brand-100 text-brand-700",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${map[color]}`}
    >
      {children}
    </span>
  );
}

const ROLE_COLOR: Record<Role, "green" | "blue" | "amber" | "violet"> = {
  GOVERNMENT: "green",
  INSTITUTION: "blue",
  STUDENT: "violet",
  VENDOR: "amber",
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge color={ROLE_COLOR[role]}>{ROLE_LABELS[role]}</Badge>;
}

export function CategoryBadge({ category }: { category: Category | null }) {
  if (!category) return <Badge color="slate">—</Badge>;
  const color =
    category === "ISSUANCE"
      ? "green"
      : category === "TUITION"
      ? "blue"
      : category === "EXAMINATION"
      ? "violet"
      : category === "HOSTEL"
      ? "amber"
      : "slate";
  return <Badge color={color as never}>{CATEGORY_LABELS[category]}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const color =
    status === "CONFIRMED"
      ? "green"
      : status === "REJECTED"
      ? "red"
      : "amber";
  return <Badge color={color as never}>{status}</Badge>;
}

/** Monospaced, truncated hash / address with copy-on-click. */
export function Hash({
  value,
  chars = 10,
  className = "",
}: {
  value: string;
  chars?: number;
  className?: string;
}) {
  const short =
    value.length > chars * 2 + 3
      ? `${value.slice(0, chars)}…${value.slice(-chars)}`
      : value;
  return (
    <span
      title={value}
      onClick={() => navigator.clipboard?.writeText(value)}
      className={`mono cursor-pointer rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-200 ${className}`}
    >
      {short}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label ?? "Loading…"}
    </div>
  );
}

export function EDU({ amount }: { amount: number }) {
  return (
    <span className="mono font-medium">
      {amount.toLocaleString()} <span className="text-slate-400">EDU</span>
    </span>
  );
}
