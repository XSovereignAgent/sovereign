"use client";

import { WalletProvider } from "@/lib/walletContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
