import { GITHUB_REPO_URL } from "@/lib/site-config";

const LINKS = [
  { href: "#overview", label: "Overview" },
  { href: "#demo", label: "Demo" },
  { href: "#architecture", label: "Architecture" },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/90 backdrop-blur">
      <nav className="section-shell flex h-16 items-center justify-between">
        <a href="#top" className="text-[15px] font-semibold tracking-tight text-ink">
          DyadLab
        </a>
        <ul className="flex items-center gap-6 text-sm text-ink-muted">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition-colors hover:text-accent-strong">
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border px-3 py-1.5 font-medium text-ink transition-colors hover:border-accent hover:text-accent-strong"
            >
              GitHub
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
