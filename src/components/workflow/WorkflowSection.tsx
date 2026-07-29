import { SectionHeading } from "@/components/ui/SectionHeading";

const STEPS = [
  {
    number: "1",
    title: "Configure",
    description: "The researcher creates a session, chooses interaction conditions, and generates participant links.",
    art: (
      <div className="flex w-full flex-col gap-1.5">
        <div className="h-2 w-3/4 rounded-full bg-accent-soft" />
        <div className="h-2 w-1/2 rounded-full bg-accent-soft" />
        <div className="mt-1 h-6 w-full rounded-md border border-dashed border-accent/40 bg-accent-soft/40" />
      </div>
    ),
  },
  {
    number: "2",
    title: "Interact",
    description: "Two participants join a video call and complete a collaborative activity.",
    art: (
      <div className="flex w-full gap-1.5">
        <div className="h-9 flex-1 rounded-md bg-ink" />
        <div className="h-9 flex-1 rounded-md bg-ink/70" />
      </div>
    ),
  },
  {
    number: "3",
    title: "Analyze",
    description: "The system stores condition changes, task progress, timestamps, and session-quality information.",
    art: (
      <div className="w-full space-y-1 font-mono text-[9px] text-ink-muted">
        <div className="h-1.5 w-full rounded bg-black/[0.06]" />
        <div className="h-1.5 w-4/5 rounded bg-black/[0.06]" />
        <div className="h-1.5 w-full rounded bg-accent-soft" />
      </div>
    ),
  },
];

export function WorkflowSection() {
  return (
    <section id="overview" className="border-b border-border py-20 md:py-28">
      <div className="section-shell">
        <SectionHeading
          eyebrow="How an experiment works"
          title="Three steps, from session setup to structured data"
          align="left"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="card-surface p-6">
              <div className="mb-6 flex h-16 items-center rounded-md bg-black/[0.02] p-3">{step.art}</div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-white">
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
