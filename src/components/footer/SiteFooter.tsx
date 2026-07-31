import { GITHUB_DESIGN_DOC_URL, GITHUB_REPO_URL } from "@/lib/site-config";

const TILES = [
  {
    label: "Project",
    value: "DyadLab",
    detail: "Built by Vladimir Hegai, Queen's Computer Engineering.",
    tone: "accent" as const,
  },
  {
    label: "Source",
    value: "GitHub",
    detail: "Full frontend, backend, and test suite.",
    href: GITHUB_REPO_URL,
    tone: "magenta" as const,
  },
  {
    label: "Docs",
    value: "Design doc",
    detail: "Product, IA, and visual-system rationale.",
    href: GITHUB_DESIGN_DOC_URL,
    tone: "accent" as const,
  },
  {
    label: "Built for",
    value: "FW26Q027",
    detail: "QuAD Lab Work Study application, Queen's University.",
    tone: "magenta" as const,
  },
];

const TONE_BG: Record<string, string> = {
  accent: "bg-accent",
  magenta: "bg-magenta",
};

export function SiteFooter() {
  return (
    <footer className="pt-16 pb-10 md:pt-24">
      <div className="section-shell">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TILES.map((tile) => {
            const Wrapper = tile.href ? "a" : "div";
            return (
              <Wrapper
                key={tile.label}
                {...(tile.href ? { href: tile.href, target: "_blank", rel: "noreferrer" } : {})}
                className={`${TONE_BG[tile.tone]} flex flex-col gap-1.5 rounded-2xl p-6 text-white transition-opacity hover:opacity-90`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">{tile.label}</p>
                <p className="font-display text-lg font-medium">{tile.value}</p>
                <p className="text-[12.5px] leading-relaxed text-white/75">{tile.detail}</p>
              </Wrapper>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
