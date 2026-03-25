import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "X-Sovereign | AI Trading Terminal",
  description:
    "A production-grade conversational AI trading terminal on X Layer. One command. Three agents. Full execution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
