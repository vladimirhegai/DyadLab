import type { Metadata } from "next";
import { SessionClient } from "@/components/live/SessionClient";
import type { ParticipantId } from "@/lib/demo/types";

export const metadata: Metadata = {
  title: "DyadLab — Participant Session",
  robots: { index: false, follow: false },
};

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string | string[];
    participant?: string | string[];
    token?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const initialCode = typeof query.code === "string" ? query.code : undefined;
  const initialParticipant =
    query.participant === "P01" || query.participant === "P02"
      ? (query.participant as ParticipantId)
      : undefined;
  const initialToken =
    typeof query.token === "string" ? query.token : undefined;

  return (
    <SessionClient
      initialCode={initialCode}
      initialParticipant={initialParticipant}
      initialToken={initialToken}
    />
  );
}
