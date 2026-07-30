import { ButtonLink } from "@/components/ui/Button";
import { GITHUB_REPO_URL } from "@/lib/site-config";

export function ClosingSection() {
  return (
    <section className="bg-bg-soft py-16 md:py-20">
      <div className="section-shell max-w-3xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-magenta">
          Choose your path
        </p>
        <h2 className="font-display mt-3 text-[clamp(2rem,4vw,3rem)] font-semibold tracking-tight text-ink">
          See the experiment in action.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-muted">
          Play immediately with a simulated partner, or open the researcher dashboard to
          configure a real two-person session.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink variant="primary" href="/spotlight-sync">
            Play Spotlight Sync
          </ButtonLink>
          <ButtonLink variant="secondary" href="/dashboard">
            Launch a live session
          </ButtonLink>
          <ButtonLink variant="ghost" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
            View source
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
