function Node({
  title,
  subtitle,
  className = "",
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`card-surface px-4 py-3 text-center ${className}`}>
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      {subtitle && <p className="mt-0.5 text-[11px] text-ink-muted">{subtitle}</p>}
    </div>
  );
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1 text-ink-muted">
      {label && <span className="mb-0.5 text-[10px] uppercase tracking-wide">{label}</span>}
      <span aria-hidden className="text-lg leading-none">
        ↓
      </span>
    </div>
  );
}

export function ArchitectureDiagram() {
  return (
    <div className="card-surface p-6 md:p-8">
      <div className="mx-auto flex max-w-md flex-col items-stretch">
        <div className="grid grid-cols-2 gap-3">
          <Node title="Participant A" />
          <Node title="Participant B" />
        </div>
        <Arrow label="WebRTC audio / video" />
        <Node title="React application" subtitle="TypeScript, browser client" />
        <Arrow label="WebSocket / REST API" />
        <Node title="FastAPI backend" subtitle="session + signaling logic" />
        <Arrow />
        <div className="grid grid-cols-2 gap-3">
          <Node title="Session data" subtitle="SQLite" />
          <Node title="Media metadata" subtitle="secure storage" />
        </div>
      </div>
    </div>
  );
}
