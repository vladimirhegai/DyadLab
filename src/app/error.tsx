"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { SiteNav } from "@/components/nav/SiteNav";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <SiteNav />
      <main className="grid flex-1 place-items-center bg-bg-soft px-5 py-20">
        <section className="card-surface max-w-xl p-8 text-center">
          <p className="text-sm font-semibold text-magenta">Something interrupted the session</p>
          <h1 className="font-display mt-3 text-3xl font-semibold text-ink">
            DyadLab could not finish loading this view.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            Your browser has not submitted a new action. Try the view again, or return
            home and start a fresh session if the problem continues.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button variant="primary" onClick={reset}>
              Try again
            </Button>
            <Button variant="secondary" onClick={() => window.location.assign("/")}>
              Return home
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
