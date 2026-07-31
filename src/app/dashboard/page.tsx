import type { Metadata } from "next";
import { DashboardClient } from "@/components/live/DashboardClient";

export const metadata: Metadata = {
  title: "DyadLab — Live Researcher Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string | string[];
    token?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const initialCode = typeof query.code === "string" ? query.code : undefined;
  const initialToken =
    typeof query.token === "string" ? query.token : undefined;
  return (
    <DashboardClient initialCode={initialCode} initialToken={initialToken} />
  );
}
