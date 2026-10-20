import type { Metadata } from "next";
import "./globals.css";
import { SSEProvider } from "../components/SSEProvider";
import { AppShell } from "../components/AppShell";

export const metadata: Metadata = {
  title: "BLAD Security Platform",
  description: "Blockchain Log Anomaly Detection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body
        className="min-h-full font-sans overflow-hidden"
        style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
      >
        <SSEProvider>
          <AppShell>{children}</AppShell>
        </SSEProvider>
      </body>
    </html>
  );
}
