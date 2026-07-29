import { ButtonLink } from "@/components/ui/Button";
import { GITHUB_REPO_URL } from "@/lib/site-config";
import { HeroMockup } from "./HeroMockup";

export function Hero() {
  return (
    <section id="top" className="border-b border-border py-16 md:py-24">
      <div className="section-shell grid items-center gap-12 md:grid-cols-2 md:gap-10">
        <div>
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-accent-strong">
            Research-software prototype
          </p>
          <h1 className="text-[40px] font-semibold leading-[1.08] tracking-tight text-ink md:text-[52px]">
            DyadLab: Controlled Virtual Interaction Research
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            A research platform for controlled virtual-interaction experiments. Researchers run two-person
            collaborative activities, manipulate video conditions in real time, and collect timestamped
            behavioral data for later analysis.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink variant="primary" size="md" href="#demo">
              Try the interactive demo
            </ButtonLink>
            <ButtonLink variant="secondary" size="md" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
              View source code
            </ButtonLink>
          </div>
          <p className="mt-6 text-sm text-ink-muted">
            Built with React, TypeScript, WebRTC, FastAPI, and SQLite.
          </p>
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}
