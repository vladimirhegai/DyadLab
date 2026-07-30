function Stage({
  title,
  subtitle,
  dot,
}: {
  title: string;
  subtitle?: string;
  dot: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dot }} />
      <div>
        <p className="text-[13.5px] font-semibold text-ink">{title}</p>
        {subtitle && <p className="text-[12px] text-ink-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

function Connector({ label }: { label: string }) {
  return (
    <div className="ml-[4.5px] flex items-center gap-2 border-l-2 border-dashed border-accent-soft py-1.5 pl-[16px] text-[10.5px] uppercase tracking-wide text-ink-muted">
      {label}
    </div>
  );
}

export function ArchitectureDiagram() {
  return (
    <div className="rounded-2xl bg-white/95 p-6 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)] md:p-8">
      <div className="mx-auto flex max-w-md flex-col">
        <div className="grid grid-cols-2 gap-x-4">
          <Stage title="Participant A" dot="var(--color-accent)" />
          <Stage title="Participant B" dot="var(--color-magenta)" />
        </div>
        <Connector label="WebRTC audio / video" />
        <Stage title="React application" subtitle="TypeScript, browser client" dot="var(--color-accent)" />
        <Connector label="WebSocket / REST API" />
        <Stage title="FastAPI backend" subtitle="session + signaling logic" dot="var(--color-magenta)" />
        <Connector label="" />
        <div className="grid grid-cols-2 gap-x-4">
          <Stage title="Session data" subtitle="SQLite" dot="var(--color-accent)" />
          <Stage title="Media metadata" subtitle="secure storage" dot="var(--color-magenta)" />
        </div>
      </div>
    </div>
  );
}
