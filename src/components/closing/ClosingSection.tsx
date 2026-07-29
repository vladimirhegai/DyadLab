import { ButtonLink } from "@/components/ui/Button";
import { GITHUB_DESIGN_DOC_URL, GITHUB_REPO_URL } from "@/lib/site-config";

export function ClosingSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="section-shell max-w-2xl">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-accent-strong">What I built</p>
        <h2 className="mt-3 text-[26px] font-semibold tracking-tight text-ink md:text-[30px]">
          An independent research-software prototype
        </h2>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">
          I designed and developed DyadLab end to end: the participant experience, researcher controls,
          real-time communication, structured event collection, data export, automated testing, and the
          technical documentation in this repository.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink variant="primary" href="#demo">
            Open Demo
          </ButtonLink>
          <ButtonLink variant="secondary" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
            View GitHub
          </ButtonLink>
          <ButtonLink variant="ghost" href={GITHUB_DESIGN_DOC_URL} target="_blank" rel="noreferrer">
            Read Documentation
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
