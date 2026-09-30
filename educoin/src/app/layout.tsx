import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "EduCoin — Scholarship Blockchain",
  description:
    "A blockchain-enabled stable digital currency that restricts scholarship funds to authorized educational purposes. B.Tech Major Project, Team 6.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
