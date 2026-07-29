import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DyadLab — Controlled Virtual Interaction Research",
  description:
    "A research-software prototype for controlled two-person virtual interaction experiments: researcher-controlled video conditions, a collaborative task, and timestamped behavioral data collection.",
  metadataBase: new URL("https://dyadlab.vercel.app"),
  openGraph: {
    title: "DyadLab — Controlled Virtual Interaction Research",
    description:
      "Researchers can run two-person collaborative activities, manipulate video conditions in real time, and collect timestamped behavioral data for later analysis.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-ink">{children}</body>
    </html>
  );
}
