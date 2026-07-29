import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "DyadLab — Researcher Dashboard (in progress)",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <main className="flex flex-1 items-center justify-center py-24">
      <div className="section-shell max-w-lg text-center">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-accent-strong">Backend phase</p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-ink">
          The backend-connected dashboard isn&apos;t wired up yet
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
          This route is reserved for the real researcher dashboard: creating persistent sessions, monitoring
          live connection state, and controlling actual participant streams via the FastAPI backend. See{" "}
          <code className="rounded bg-black/[0.05] px-1.5 py-0.5 text-[13px]">HANDOFF.md</code> in the repository
          for the implementation plan. The fully working, simulated version of this dashboard lives on the
          homepage demo.
        </p>
        <div className="mt-8">
          <ButtonLink variant="primary" href="/#demo">
            Back to the simulated demo
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
