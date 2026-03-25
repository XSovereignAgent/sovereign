"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

interface WalletState {
  address: string | null;
  balance: string | null;
  isConnected: boolean;
  chainId: number | null;
  isCorrectChain: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToXLayer: () => Promise<void>;
}

const XLAYER_CHAIN_ID = 196;
const XLAYER_CONFIG = {
  chainId: "0xC4", // 196 in hex
  chainName: "X Layer Mainnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: ["https://rpc.xlayer.tech"],
  blockExplorerUrls: ["https://www.okx.com/explorer/xlayer"],
};

const WalletContext = createContext<WalletState>({
  address: null,
  balance: null,
  isConnected: false,
  chainId: null,
  isCorrectChain: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  switchToXLayer: async () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const isConnected = !!address;
  const isCorrectChain = chainId === XLAYER_CHAIN_ID;

  const fetchBalance = useCallback(async (acc: string) => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const balStr = await (window as any).ethereum.request({ method: "eth_getBalance", params: [acc, "latest"] });
        setBalance((parseInt(balStr, 16) / 1e18).toFixed(4));
      } catch {
        setBalance("0.0000");
      }
    }
  }, []);

  // Restore previous connection on mount
  useEffect(() => {
    const saved = localStorage.getItem("xsov_wallet");
    if (saved && typeof window !== "undefined" && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setAddress(accounts[0]);
            fetchBalance(accounts[0]);
          }
        })
        .catch(() => {});

      (window as any).ethereum
        .request({ method: "eth_chainId" })
        .then((id: string) => setChainId(parseInt(id, 16)))
        .catch(() => {});
    }
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    const eth = (window as any).ethereum;

    const handleAccounts = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null);
        setBalance(null);
        localStorage.removeItem("xsov_wallet");
      } else {
        setAddress(accounts[0]);
        fetchBalance(accounts[0]);
      }
    };
    const handleChain = (id: string) => setChainId(parseInt(id, 16));

    eth.on("accountsChanged", handleAccounts);
    eth.on("chainChanged", handleChain);
    return () => {
      eth.removeListener("accountsChanged", handleAccounts);
      eth.removeListener("chainChanged", handleChain);
    };
  }, []);

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("Please install MetaMask or OKX Wallet to continue.");
      return;
    }
    try {
      const accounts: string[] = await (window as any).ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        fetchBalance(accounts[0]);
        localStorage.setItem("xsov_wallet", accounts[0]);
      }
      const id: string = await (window as any).ethereum.request({ method: "eth_chainId" });
      setChainId(parseInt(id, 16));
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAddress(null);
    setBalance(null);
    setChainId(null);
    localStorage.removeItem("xsov_wallet");
  }, []);

  const switchToXLayer = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: XLAYER_CONFIG.chainId }],
      });
    } catch (switchError: any) {
      // Chain not added yet — add it
      if (switchError.code === 4902) {
        await (window as any).ethereum.request({
          method: "wallet_addEthereumChain",
          params: [XLAYER_CONFIG],
        });
      }
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{ address, balance, isConnected, chainId, isCorrectChain, connectWallet, disconnectWallet, switchToXLayer }}
    >
      {children}
    </WalletContext.Provider>
  );
}
