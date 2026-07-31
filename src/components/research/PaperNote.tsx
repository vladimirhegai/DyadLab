const PERIPHERAL_PAPER =
  "https://effiejpereira.github.io/files/pdf/pereira%20castelhano-%20peripheral%20guidance%20in%20scenes.pdf";
const CAPTURE_PAPER = "https://doi.org/10.3758/s13423-019-01610-z";

const GAME_LOGIC = [
  {
    label: "Roles alternate",
    detail: "One person receives WHAT and the other WHERE. The assignment can swap next round.",
  },
  {
    label: "Clues intersect",
    detail: "Each clue matches several objects alone. Together, they identify one shared target.",
  },
  {
    label: "Coordination becomes data",
    detail: "DyadLab records focus paths, overlap timing, errors, and responses to distraction.",
  },
];

export function PaperNote() {
  return (
    <section id="paper" className="bg-white py-16 md:py-24">
      <div className="section-shell grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-magenta">
            The research behind the game
          </p>
          <h2 className="font-display mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-ink md:text-[2.6rem] md:leading-[1.08]">
            Built from how attention moves through a room.
          </h2>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-muted">
            People use scene context to search likely surfaces first: a mug belongs on a desk,
            not a ceiling. Spotlight Sync separates object identity from location, alternates
            who knows each clue, and measures how two people narrow the same search together.
          </p>

          <dl className="mt-10 grid gap-6 sm:grid-cols-3">
            {GAME_LOGIC.map((item) => (
              <div key={item.label} className="border-t border-border pt-4">
                <dt className="font-display text-lg font-semibold text-ink">{item.label}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-muted">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="rounded-2xl bg-bg-soft p-6 md:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-magenta">
            Research basis
          </p>
          <ul className="mt-4 grid gap-4">
            <li>
              <a className="group block" href={CAPTURE_PAPER} target="_blank" rel="noreferrer">
                <span className="text-sm font-semibold text-accent underline decoration-accent/25 underline-offset-4 group-hover:decoration-accent">
                  Attentional capture is contingent on scene region
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-muted">
                  Pereira &amp; Castelhano, 2019
                </span>
              </a>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                In the bot demo: every round, one object flashes. It is never the answer. What is
                recorded is whether it pulled you, and whether it sat on a surface the target
                could have been on.
              </p>
            </li>
            <li className="border-t border-border pt-4">
              <a
                className="group block"
                href={PERIPHERAL_PAPER}
                target="_blank"
                rel="noreferrer"
              >
                <span className="text-sm font-semibold text-accent underline decoration-accent/25 underline-offset-4 group-hover:decoration-accent">
                  Peripheral guidance in scenes
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-muted">
                  Pereira &amp; Castelhano
                </span>
              </a>
            </li>
          </ul>

          <p className="mt-6 border-t border-border pt-5 text-xs leading-relaxed text-ink-muted">
            Prototype only. A real study would require validated timing, counterbalancing,
            security review, and research ethics approval.
          </p>
        </aside>
      </div>
    </section>
  );
}
