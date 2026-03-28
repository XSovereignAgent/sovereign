"use client";

import { WalletProvider } from "@/lib/walletContext";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <WalletProvider>{children}</WalletProvider>
    </ThemeProvider>
  );
}
