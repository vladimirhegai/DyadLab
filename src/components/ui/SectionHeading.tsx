import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  align?: "left" | "center";
}

export function SectionHeading({ eyebrow, title, description, align = "left" }: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "text-center mx-auto max-w-2xl" : ""}>
      {eyebrow && (
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-accent-strong">{eyebrow}</p>
      )}
      <h2 className="text-[28px] md:text-[32px] font-semibold tracking-tight text-ink">{title}</h2>
      {description && <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">{description}</p>}
    </div>
  );
}
