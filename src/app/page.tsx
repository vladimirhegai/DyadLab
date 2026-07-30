import { ClosingSection } from "@/components/closing/ClosingSection";
import { SiteFooter } from "@/components/footer/SiteFooter";
import { HeroSpotlightPreview } from "@/components/hero/HeroSpotlightPreview";
import { SiteNav } from "@/components/nav/SiteNav";
import { PaperNote } from "@/components/research/PaperNote";
import { ButtonLink } from "@/components/ui/Button";
import { WorkflowSection } from "@/components/workflow/WorkflowSection";
import "./home.css";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <section id="top" className="home-hero">
          <div className="home-hero-shell">
            <div className="home-hero-copy">
              <p className="home-hero-kicker">
                A working virtual-interaction research prototype
              </p>
              <h1>
                Study what happens when <span>two people look together.</span>
              </h1>
              <p className="home-hero-lede">
                Configure a two-person session, play a collaborative visual-search game,
                and export every timestamped behavior for analysis.
              </p>
              <div className="home-hero-actions">
                <ButtonLink
                  href="/spotlight-sync"
                  variant="onGradient"
                  className="home-hero-primary"
                >
                  Play Spotlight Sync
                </ButtonLink>
                <ButtonLink href="/dashboard" variant="onGradientGhost">
                  Launch a live session
                </ButtonLink>
              </div>
              <ul className="home-hero-proof" aria-label="Demo benefits">
                <li>No setup</li>
                <li>No camera permission</li>
                <li>Simulated partner included</li>
              </ul>
            </div>

            <div className="home-hero-visual">
              <HeroSpotlightPreview />
            </div>
          </div>
          <div className="home-hero-wave" aria-hidden="true" />
        </section>

        <WorkflowSection />
        <PaperNote />
        <ClosingSection />
      </main>
      <SiteFooter />
    </>
  );
}
