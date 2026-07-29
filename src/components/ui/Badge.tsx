import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  tone?: "accent" | "warn" | "neutral";
}

const tones = {
  accent: "bg-accent-soft text-accent-strong",
  warn: "bg-warn-soft text-warn",
  neutral: "bg-black/[0.04] text-ink-muted",
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
