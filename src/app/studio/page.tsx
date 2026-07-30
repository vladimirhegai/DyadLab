import type { Metadata } from "next";
import { OperateHeader } from "@/components/nav/OperateHeader";
import { RecordingStudio } from "@/components/studio/RecordingStudio";

export const metadata: Metadata = {
  title: "DyadLab Studio — Recording Tool",
  robots: { index: false, follow: false },
};

export default function StudioPage() {
  return (
    <>
      <OperateHeader label="Internal tool" />
      <main className="flex-1 py-12">
        <div className="section-shell max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-magenta">Internal tool</p>
          <h1 className="font-display mt-2 text-[28px] font-medium tracking-tight text-ink">Recording Studio</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
            Record short looping clips of yourself to use as placeholder participant video in the hero mockup or
            demo tiles. Nothing here is required — the site works with generated placeholders — but a real clip
            adds polish. Recordings stay in your browser; nothing is uploaded anywhere.
          </p>
          <RecordingStudio />
        </div>
      </main>
    </>
  );
}
