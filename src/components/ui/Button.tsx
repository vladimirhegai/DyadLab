import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "warn" | "onGradient" | "onGradientGhost";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-[0_4px_14px_-4px_rgba(122,15,140,0.55)] hover:bg-accent-strong hover:shadow-[0_6px_18px_-4px_rgba(122,15,140,0.6)]",
  secondary: "border-2 border-accent/25 bg-surface text-accent-strong hover:border-accent hover:bg-accent-soft",
  ghost: "text-ink-muted hover:text-accent-strong hover:bg-accent-soft/60",
  warn: "bg-warn text-white hover:opacity-90",
  // For CTAs placed directly on the gradient hero / deep-color bands, where
  // primary/secondary's own bg-accent + text-white classes would conflict.
  onGradient: "bg-white text-accent-strong shadow-[0_8px_24px_-6px_rgba(0,0,0,0.35)] hover:bg-white/90",
  onGradientGhost: "border-2 border-white/40 text-white hover:border-white hover:bg-white/10",
};

const sizes: Record<Size, string> = {
  md: "px-6 py-2.5 text-sm",
  sm: "px-4 py-1.5 text-xs",
};

export function buttonClasses({
  variant = "secondary",
  size = "md",
  active,
  className = "",
}: {
  variant?: Variant;
  size?: Size;
  active?: boolean;
  className?: string;
}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${active ? "ring-2 ring-accent ring-offset-1" : ""} ${className}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  active?: boolean;
}

export function Button({ variant, size, active, className, children, ...props }: ButtonProps) {
  return (
    <button className={buttonClasses({ variant, size, active, className })} {...props}>
      {children}
    </button>
  );
}

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function ButtonLink({ variant, size, className, children, ...props }: ButtonLinkProps) {
  return (
    <a className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </a>
  );
}
