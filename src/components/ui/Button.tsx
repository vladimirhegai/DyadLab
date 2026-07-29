import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "warn";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong",
  secondary: "border border-border bg-surface text-ink hover:border-accent hover:text-accent-strong",
  ghost: "text-ink-muted hover:text-ink hover:bg-black/[0.03]",
  warn: "bg-warn text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  md: "px-5 py-2.5 text-sm",
  sm: "px-3.5 py-1.5 text-xs",
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
