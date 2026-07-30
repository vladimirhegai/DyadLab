import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  align?: "left" | "center";
  onDark?: boolean;
}

export function SectionHeading({ eyebrow, title, description, align = "left", onDark = false }: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "text-center mx-auto max-w-2xl" : ""}>
      {eyebrow && (
        <p
          className={`mb-3 text-[13px] font-semibold uppercase tracking-wider ${
            onDark ? "text-white/80" : "text-magenta"
          }`}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={`font-display text-[30px] md:text-[38px] font-medium leading-[1.1] tracking-tight ${
          onDark ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p className={`mt-3 text-[16px] leading-relaxed ${onDark ? "text-white/85" : "text-ink-muted"}`}>
          {description}
        </p>
      )}
    </div>
  );
}
