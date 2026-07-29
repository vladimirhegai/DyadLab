function ParticipantPlaceholder({ label, tint }: { label: string; tint: string }) {
  return (
    <div className="relative flex aspect-video flex-1 items-center justify-center overflow-hidden rounded-md border border-border bg-ink">
      <div
        className="animate-breathe flex h-14 w-14 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ background: tint }}
      >
        {label}
      </div>
      <div className="absolute bottom-2 left-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
        {label}
      </div>
      <div className="absolute bottom-2 right-2 flex items-end gap-[2px]">
        {[3, 6, 4, 8, 5].map((h, i) => (
          <span
            key={i}
            className="animate-breathe w-[2px] rounded-full bg-white/70"
            style={{ height: `${h}px`, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function LegendItem({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent-strong">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      {children}
    </span>
  );
}

export function HeroMockup() {
  return (
    <div>
      <div className="card-surface overflow-hidden">
        <div className="flex items-center gap-1.5 border-b border-border bg-black/[0.02] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
          <span className="ml-3 truncate rounded bg-black/[0.04] px-2 py-0.5 text-[11px] text-ink-muted">
            dyadlab.app/session/QRX-492
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-[1fr_190px]">
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <ParticipantPlaceholder label="P01" tint="#1f6f78" />
              <ParticipantPlaceholder label="P02" tint="#3b5b8c" />
            </div>
            <div className="card-surface flex items-center justify-between px-3 py-2">
              <span className="text-[11px] font-medium text-ink-muted">Common-ground card task</span>
              <div className="flex gap-1">
                {["c1", "c2", "c3", "c4"].map((id, i) => (
                  <span
                    key={id}
                    className={`h-4 w-4 rounded-sm border ${
                      i < 3 ? "border-accent bg-accent-soft" : "border-border bg-black/[0.03]"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-medium text-accent-strong">3 / 4 agreed</span>
            </div>
            <div className="card-surface px-3 py-2 font-mono text-[10.5px] leading-relaxed text-ink-muted">
              <div>00:00:04 &nbsp;P01&nbsp; joined_session</div>
              <div>00:00:27 &nbsp;researcher&nbsp; video_condition: blurred</div>
              <div className="text-accent-strong">00:00:31 &nbsp;session&nbsp; agreement_reached: c3</div>
            </div>
          </div>

          <div className="card-surface flex flex-col gap-2 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Researcher controls</p>
            {["Disable Video", "Blur Video", "Grayscale", "Hide Self-View"].map((label) => (
              <div
                key={label}
                className="rounded-md border border-border px-2.5 py-1.5 text-center text-[11px] font-medium text-ink"
              >
                {label}
              </div>
            ))}
            <div className="mt-1 rounded-md bg-warn-soft px-2.5 py-1.5 text-center text-[11px] font-medium text-warn">
              ● Recording
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <LegendItem>Researcher-controlled conditions</LegendItem>
        <LegendItem>Collaborative participant task</LegendItem>
        <LegendItem>Timestamped event collection</LegendItem>
      </div>
    </div>
  );
}
