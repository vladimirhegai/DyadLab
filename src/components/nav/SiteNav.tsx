import Link from "next/link";

const LINKS = [
  { href: "/spotlight-sync", label: "Play the game" },
  { href: "#overview", label: "How it works", showMobile: true },
  { href: "#paper", label: "Research" },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg">
      <nav className="section-shell flex h-16 items-center justify-between">
        <Link href="#top" className="flex items-center gap-2.5 text-[16px] font-semibold tracking-tight text-ink">
          <span className="dyad-mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <span className="font-display">DyadLab</span>
        </Link>
        <ul className="flex items-center gap-5 text-sm font-medium text-ink-muted">
          {LINKS.map((link) => (
            <li key={link.href} className={link.showMobile ? "block" : "hidden sm:block"}>
              <Link href={link.href} className="transition-colors hover:text-magenta">
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/spotlight-sync"
              className="rounded-full bg-accent px-4 py-2 font-semibold text-white shadow-[0_4px_14px_-5px_rgba(122,15,140,0.65)] transition-colors hover:bg-accent-strong"
            >
              <span className="sm:hidden">Play</span>
              <span className="hidden sm:inline">Try the demo</span>
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
