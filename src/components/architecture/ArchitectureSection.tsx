import { SectionHeading } from "@/components/ui/SectionHeading";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { ArchitectureDiagram } from "./ArchitectureDiagram";

const DECISIONS = [
  {
    title: "Real-time communication",
    description: "WebRTC for direct participant audio and video, minimizing latency between the two feeds.",
  },
  {
    title: "Researcher control",
    description: "WebSockets push condition changes to participants immediately, with no page reload.",
  },
  {
    title: "Structured data",
    description: "Every event is timestamped and tied to a pseudonymous participant ID, not a name.",
  },
  {
    title: "Reliability",
    description: "Automated browser testing and session-validation checks guard the core interaction flow.",
  },
];

export function ArchitectureSection() {
  return (
    <section id="architecture" className="gradient-field relative overflow-hidden">
      <WaveDivider color="var(--color-bg)" flip className="relative z-10" />
      <div className="section-shell relative z-10 py-4 md:py-8">
        <SectionHeading eyebrow="Engineering" title="How the platform is put together" onDark />
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <ArchitectureDiagram />
          <div className="grid gap-4 sm:grid-cols-2">
            {DECISIONS.map((d) => (
              <div key={d.title} className="rounded-2xl bg-white/95 p-5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]">
                <h3 className="text-[14px] font-semibold text-ink">{d.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{d.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <WaveDivider color="var(--color-bg)" className="relative z-10" />
    </section>
  );
}
