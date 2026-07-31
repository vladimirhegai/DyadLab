import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const title = "DyadLab — Controlled Virtual Interaction Research";
const description =
  "A research-software prototype for controlled two-person virtual interaction experiments: researcher-controlled video conditions, a collaborative task, and timestamped behavioral data collection.";

export async function generateMetadata(): Promise<Metadata> {
  const incomingHeaders = await headers();
  const host = (
    incomingHeaders.get("x-forwarded-host") ??
    incomingHeaders.get("host") ??
    "localhost:3000"
  )
    .split(",")[0]
    .trim();
  const forwardedProtocol = incomingHeaders.get("x-forwarded-proto")?.split(",")[0].trim();
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https";
  const metadataBase = new URL(`${protocol}://${host}`);
  // Filename is versioned: social scrapers cache preview images by URL, so a
  // new artwork needs a new path to invalidate previously scraped previews.
  const socialImage = new URL("/og-v2.png", metadataBase).toString();

  return {
    title,
    description,
    metadataBase,
    openGraph: {
      title,
      description:
        "Researchers can run two-person collaborative activities, manipulate video conditions in real time, and collect timestamped behavioral data for later analysis.",
      type: "website",
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: "DyadLab: two participant spotlights overlapping on a shared target object, beside a session event log",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">{children}</body>
    </html>
  );
}
