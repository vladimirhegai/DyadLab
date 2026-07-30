import { SectionHeading } from "@/components/ui/SectionHeading";

const STEPS = [
  {
    number: "1",
    title: "Configure",
    description:
      "Create a session, choose video and task conditions, then copy two private participant links.",
    art: (
      <div className="flex w-full flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-white">Blur</span>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-ink-muted shadow-sm">
          Low FPS
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-ink-muted shadow-sm">
          Video off
        </span>
      </div>
    ),
  },
  {
    number: "2",
    title: "Interact",
    description:
      "Two people join a WebRTC call. Spotlight Sync alternates who receives the WHAT and WHERE clue.",
    art: (
      <div className="relative h-9 w-full">
        <span className="absolute left-3 top-0 h-9 w-9 rounded-full bg-magenta/80" />
        <span className="absolute left-8 top-0 h-9 w-9 rounded-full bg-[#52cfc0]/80 mix-blend-screen" />
      </div>
    ),
  },
  {
    number: "3",
    title: "Analyze",
    description:
      "An append-only timeline stores joins, condition changes, focus paths, outcomes, and CSV/JSON exports.",
    art: (
      <div className="w-full space-y-1 font-mono text-[10px] leading-tight text-ink-muted">
        <div>
          00:00:27 <span className="text-accent-strong">video_condition</span>: blurred
        </div>
        <div>
          00:00:31 <span className="text-magenta">spotlight_joint_found</span>: 420ms
        </div>
      </div>
    ),
  },
];

export function WorkflowSection() {
  return (
    <section id="overview" className="relative overflow-hidden py-20 md:py-28">
      <div className="blob -left-24 top-10 h-72 w-72 bg-accent-soft/70" aria-hidden="true" />
      <div className="blob -right-16 bottom-0 h-56 w-56 bg-magenta-soft/70" aria-hidden="true" />
      <div className="section-shell relative">
        <SectionHeading
          eyebrow="How an experiment works"
          title="Three steps, from session setup to structured data"
          align="left"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="card-surface p-6">
              <div className="mb-6 flex h-16 items-center rounded-xl bg-bg-soft p-3">{step.art}</div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-display text-[13px] font-semibold text-white">
                  {step.number}
                </span>
                <h3 className="text-[17px] font-semibold text-ink">{step.title}</h3>
              </div>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
