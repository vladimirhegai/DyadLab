import type { Metadata } from "next";
import { OperateHeader } from "@/components/nav/OperateHeader";
import { SpotlightDemo } from "@/components/spotlight/SpotlightDemo";
import { ButtonLink } from "@/components/ui/Button";
import { GITHUB_REPO_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Spotlight Sync Demo | DyadLab",
  description:
    "Play the permission-free two-person visual-search demo with a simulated partner.",
};

export default function SpotlightSyncPage() {
  return (
    <>
      <OperateHeader label="Interactive demo" />
      <main className="sl-demo-page sl-page min-h-screen pb-10 pt-4 md:pb-14 md:pt-5">
        <div className="sl-page-shell">
          <header className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-magenta">
                Permission-free bot demo
              </p>
              <h1 className="font-display mt-1 text-[clamp(2rem,4vw,3rem)] font-semibold leading-none tracking-[-0.035em] text-ink">
                Find it. <span className="text-magenta">Focus together.</span>
              </h1>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-muted">
                One player knows <strong className="text-ink">what</strong> to find and the
                other knows <strong className="text-ink">where</strong> it belongs. The roles
                alternate as you overlap your lights and solve each round.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/#overview" size="sm" variant="ghost">
                About the experiment
              </ButtonLink>
              <ButtonLink
                href={GITHUB_REPO_URL}
                size="sm"
                variant="ghost"
                target="_blank"
                rel="noreferrer"
              >
                View source
              </ButtonLink>
              <ButtonLink href="/dashboard" size="sm" variant="secondary">
                Launch live session
              </ButtonLink>
            </div>
          </header>

          <SpotlightDemo />
        </div>
      </main>
    </>
  );
}
