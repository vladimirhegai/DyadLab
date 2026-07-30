import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";

const CONSIDERATIONS = [
  "Pseudonymous participant identifiers, never names, in stored data",
  "Explicit recording state visible in the UI whenever capture is active",
  "Configurable data retention windows per study",
  "Missing-data detection on incomplete sessions",
  "Session-completion checks before data is marked analysis-ready",
  "No automated psychological conclusions drawn from behavioral signals",
];

export function ResearchConsiderations() {
  return (
    <section className="bg-bg-soft py-20 md:py-28">
      <div className="section-shell">
        <SectionHeading eyebrow="Designed as a research prototype" title="Built with research ethics in mind" />
        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {CONSIDERATIONS.map((item) => (
            <li key={item} className="card-surface flex items-start gap-3 p-4 text-[14px] text-ink">
              <span className="mt-0.5 text-accent">✓</span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <Badge tone="warn">Not for real participant use without ethics review and security validation</Badge>
        </div>
      </div>
    </section>
  );
}
