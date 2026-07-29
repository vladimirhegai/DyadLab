import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "DyadLab — Real Session (in progress)",
  robots: { index: false, follow: false },
};

export default function SessionPage() {
  return (
    <main className="flex flex-1 items-center justify-center py-24">
      <div className="section-shell max-w-lg text-center">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-accent-strong">Backend phase</p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-ink">
          Real two-browser sessions aren&apos;t wired up yet
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
          This route is reserved for the actual WebRTC participant session — real camera/mic, a session-code
          join flow, and researcher-driven condition changes delivered over WebSocket. See{" "}
          <code className="rounded bg-black/[0.05] px-1.5 py-0.5 text-[13px]">HANDOFF.md</code> in the repository
          for the implementation plan.
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
