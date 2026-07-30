import Link from "next/link";

export function OperateHeader({ label }: { label: string }) {
  return (
    <header className="sticky top-0 z-50 bg-bg">
      <div className="gradient-field h-[4px] w-full" aria-hidden="true" />
      <div className="section-shell flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-ink">
          <span className="dyad-mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <span className="font-display">DyadLab</span>
        </Link>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
      </div>
    </header>
  );
}
