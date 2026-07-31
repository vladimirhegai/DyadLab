import { SiteNav } from "@/components/nav/SiteNav";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="grid flex-1 place-items-center bg-bg-soft px-5 py-20">
        <section className="card-surface max-w-xl p-8 text-center">
          <p className="text-sm font-semibold text-magenta">Page not found</p>
          <h1 className="font-display mt-3 text-3xl font-semibold text-ink">
            This DyadLab route does not exist.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            Private session links can expire. Return home to play the permission-free
            demo, or create a new live session from the researcher dashboard.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <ButtonLink variant="primary" href="/spotlight-sync">
              Play the demo
            </ButtonLink>
            <ButtonLink variant="secondary" href="/dashboard">
              Researcher dashboard
            </ButtonLink>
          </div>
        </section>
      </main>
    </>
  );
}
