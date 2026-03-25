"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "@/lib/orchestrator";
import { orchestrate } from "@/lib/orchestrator";
import { TrendingToken, PortfolioAsset, SecurityResult, SwapResult } from "@/lib/mockOkx";
import { useWallet } from "@/lib/walletContext";
import { saveSession, loadLastSession, getMemorySummary, clearMemory } from "@/lib/memory";
import { ContractStats } from "@/types";

// ============================================
// LOGO COMPONENT
// ============================================

function SovereignLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* 
        Loading the actual true logo image you provided.
        Make sure the image file is saved as 'logo.png' in the 'public' directory of the project!
      */}
      <img 
        src="/logo.png" 
        alt="Sovereign Logo" 
        className="object-contain w-full h-full drop-shadow-[0_0_12px_rgba(105,240,174,0.6)]"
        onError={(e) => {
          // Fallback if image isn't in public folder yet
          e.currentTarget.style.display = 'none';
          e.currentTarget.parentElement!.innerHTML = '<div class="text-emerald-400 font-black text-2xl">S</div>';
        }}
      />
    </div>
  );
}

// ============================================
// DATA CARD COMPONENTS
// ============================================

function TrendingCard({ tokens }: { tokens: TrendingToken[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
      {tokens.map((t, i) => (
        <div
          key={`${t.symbol}-${i}`}
          className="bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-xl p-4 border border-white/5 hover:border-emerald-500/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-white text-sm">{t.symbol}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
              {t.change24h}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-2">{t.name}</p>
          <div className="flex items-end justify-between">
            <span className="text-lg font-bold text-white">{t.price}</span>
            <span className="text-[10px] text-gray-600">Vol: {t.volume}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Real OKX Portfolio Structure
interface RealPortfolioAsset {
  symbol: string;
  balance: string;
  tokenPrice: string;
  address?: string;
}

function PortfolioCard({ data }: { data: any }) {
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500"];
  
  // OKX returns { ok: true, data: [{ tokenAssets: [...] }] }
  const assets: RealPortfolioAsset[] = data?.[0]?.tokenAssets || [];
  
  // Calculate total USD value to derive allocations
  const totalUsd = assets.reduce((sum, a) => {
    return sum + (parseFloat(a.balance) * parseFloat(a.tokenPrice || "0"));
  }, 0);

  return (
    <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-xl p-5 border border-white/5 mt-2">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          LIVE X Layer Portfolio
        </span>
      </div>
      
      {/* Allocation bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-4 bg-black/30">
        {assets.map((a, i) => {
          const usdValue = parseFloat(a.balance) * parseFloat(a.tokenPrice || "0");
          const alloc = totalUsd > 0 ? (usdValue / totalUsd) * 100 : 0;
          return (
            <div
              key={a.symbol || i}
              className={`${colors[i % colors.length]} transition-all`}
              style={{ width: `${alloc}%` }}
            />
          );
        })}
      </div>
      
      <div className="space-y-3">
        {assets.map((a, i) => {
          const usdValue = parseFloat(a.balance) * parseFloat(a.tokenPrice || "0");
          const alloc = totalUsd > 0 ? ((usdValue / totalUsd) * 100).toFixed(1) : "0.0";
          return (
            <div key={a.symbol || i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} />
                <div>
                  <span className="text-sm font-semibold text-white">{a.symbol || "Unknown"}</span>
                  <span className="text-xs text-gray-500 ml-2">{alloc}%</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-white">
                  ${usdValue.toFixed(2)}
                </div>
                <div className="text-xs text-gray-600">
                  {parseFloat(a.balance).toFixed(4)} {a.symbol}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SecurityCard({ result }: { result: any }) {
  // Real OKX security payload: data is an array of token objects
  const tokenData = result?.[0] || result || {};
  const isSafe = tokenData.isRiskToken === false;
  const address = tokenData.tokenAddress || tokenData.address || "Sovereign Protected";

  return (
    <div
      className={`rounded-xl p-5 border mt-2 ${
        isSafe
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-red-500/5 border-red-500/20"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
            isSafe ? "bg-emerald-500/20" : "bg-red-500/20"
          }`}
        >
          {isSafe ? "🛡️" : "⚠️"}
        </div>
        <div>
          <div className={`text-sm font-bold ${isSafe ? "text-emerald-400" : "text-red-400"}`}>
            {isSafe ? "Token is Safe" : "High Risk Token Detected!"}
          </div>
          <div className="text-xs text-gray-500 font-mono mt-0.5">
            {address.substring(0, 8)}...{address.substring(address.length - 6)}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 mt-4 bg-black/20 p-3 rounded-lg border border-white/5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">Buy Tax:</span>
          <span className="text-white font-mono">{tokenData.buyTaxes || "0"}%</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">Sell Tax:</span>
          <span className="text-white font-mono">{tokenData.sellTaxes || "0"}%</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">Honeypot Risk:</span>
          <span className={isSafe ? "text-emerald-400 font-bold" : "text-red-500 font-bold"}>
            {isSafe ? "LOW" : "HIGH"}
          </span>
        </div>
      </div>
    </div>
  );
}

function SwapCard({ result }: { result: any }) {
  const quote = result?.[0] || {};
  
  // Safely parse decimals and calculate UI amounts
  const fromDecimals = parseFloat(quote.fromToken?.decimal || "18");
  const toDecimals = parseFloat(quote.toToken?.decimal || "6");
  
  const fromAmountUI = (parseFloat(quote.fromTokenAmount || "0") / Math.pow(10, fromDecimals)).toFixed(4);
  const toAmountUI = (parseFloat(quote.toTokenAmount || "0") / Math.pow(10, toDecimals)).toFixed(4);

  return (
    <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-xl p-5 border border-emerald-500/20 mt-2">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-xl">
          ✅
        </div>
        <div>
          <div className="text-sm font-bold text-emerald-400">Optimal Route Found</div>
          <div className="text-xs text-gray-500">Aggregated via OKX DEX Quote</div>
        </div>
      </div>
      <div className="flex items-center justify-between bg-black/20 rounded-lg p-3 mb-3">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Sell</div>
          <div className="text-lg font-bold text-white max-w-[80px] truncate">{fromAmountUI}</div>
          <div className="text-xs font-bold text-emerald-500">{quote.fromToken?.tokenSymbol || "FROM"}</div>
        </div>
        <div className="text-gray-600 text-lg">→</div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Receive Est.</div>
          <div className="text-lg font-bold text-emerald-400 max-w-[80px] truncate">{toAmountUI}</div>
          <div className="text-xs font-bold text-emerald-500">{quote.toToken?.tokenSymbol || "TO"}</div>
        </div>
      </div>
      <div className="text-[11px] text-gray-500 font-mono flex justify-between items-center px-1">
        <span>Est. Gas: <span className="text-gray-300">{quote.estimateGasFee || "0"} wei</span></span>
        <span>Impact: <span className="text-gray-300">{quote.priceImpactPercent || "0.00"}%</span></span>
      </div>
    </div>
  );
}

// ============================================
// AGENT STATUS SIDEBAR
// ============================================

function AgentSidebar({ activeAgent, contractStats, walletBalance }: { activeAgent: string | null; contractStats: ContractStats | null, walletBalance?: string | null }) {
  return (
    <div className="w-64 border-r border-white/5 bg-[#0c0c16] p-4 flex flex-col gap-3 shrink-0 hidden lg:flex">

      {/* Live Contract Stats */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-gray-600 font-semibold mb-2 px-1">
          On-Chain Contract
        </div>
        <div className="rounded-xl p-3 border border-cyan-500/10 bg-cyan-500/[0.03] space-y-2">
          {contractStats ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-semibold">LIVE on X Layer</span>
              </div>
              <div className="font-mono text-[9px] text-gray-500 break-all">
                {contractStats.address.slice(0, 8)}...{contractStats.address.slice(-6)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/20 rounded-lg p-2">
                  <div className="text-[9px] text-gray-500">Wallet Balance</div>
                  <div className="text-xs font-bold text-white">{walletBalance || "0.0000"} OKB</div>
                </div>
                <div className="bg-black/20 rounded-lg p-2">
                  <div className="text-[9px] text-gray-500">Internal Hires</div>
                  <div className="text-xs font-bold text-white">{contractStats.totalHires}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-gray-600 border-t-emerald-400 rounded-full animate-spin" />
              <span className="text-[10px] text-gray-500">Loading contract...</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-gray-600 font-semibold mb-2 px-1">
          X-Agent Market
        </div>
        <div className="rounded-xl p-3 border border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="text-sm">🏪</span>
            <div>
              <div className="text-[10px] text-gray-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                LIVE on X Layer
              </div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">0xF53e...470C</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{contractStats ? contractStats.agentsMinted : "5"} agents minted</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CHAT BUBBLE COMPONENT
// ============================================

function ChatBubble({ 
  message, 
  onSend 
}: { 
  message: ChatMessage;
  onSend?: (cmd: string) => void;
}) {
  // Render data cards based on content type
  if (message.type === "data-card" && message.data) {
    const data = message.data;
    if (message.content === "trending" && Array.isArray(data)) {
      return (
        <BubbleWrapper message={message}>
          <div className="text-sm text-gray-400 mb-1">
            <span className="text-emerald-400 font-semibold">{message.agentName}</span> found trending tokens:
          </div>
          <TrendingCard tokens={data as unknown as TrendingToken[]} />
        </BubbleWrapper>
      );
    }
    if (message.content === "portfolio" && Array.isArray(data)) {
      return (
        <BubbleWrapper message={message}>
          <div className="text-sm text-gray-400 mb-1">
            <span className="text-blue-400 font-semibold">{message.agentName}</span> retrieved your portfolio:
          </div>
          <PortfolioCard assets={data as unknown as PortfolioAsset[]} />
        </BubbleWrapper>
      );
    }
    if (message.content === "security") {
      return (
        <BubbleWrapper message={message}>
          <div className="text-sm text-gray-400 mb-1">
            <span className="text-emerald-400 font-semibold">{message.agentName}</span> completed the security audit:
          </div>
          <SecurityCard result={Array.isArray(data) ? data : [data]} />
        </BubbleWrapper>
      );
    }
    if (message.content === "swap" && !Array.isArray(data)) {
      return (
        <BubbleWrapper message={message}>
          <SwapCard result={data as unknown as SwapResult} />
        </BubbleWrapper>
      );
    }
  }

  // Render confirmation prompt
  if (message.type === "confirmation") {
    return (
      <BubbleWrapper message={message}>
         <div className="text-sm font-semibold mb-2">{message.content}</div>
         <div className="flex gap-2 mt-4">
           {message.data?.action === "mint_agent" ? (
             <>
               <button
                 className="flex-1 bg-emerald-500/20 text-emerald-400 font-bold text-sm py-2.5 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/30 transition-all cursor-pointer"
                 onClick={() => onSend?.("_sys_internal_confirm_true")}
               >
                 ✅ Proceed (0.001 OKB)
               </button>
               <button
                 className="flex-1 bg-red-500/20 text-red-400 font-bold text-sm py-2.5 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-all cursor-pointer"
                 onClick={() => onSend?.("_sys_internal_confirm_false")}
               >
                 ✕ Cancel
               </button>
             </>
           ) : (
             <>
               <button
                 className="flex-1 bg-emerald-500/20 text-emerald-400 font-bold text-sm py-2.5 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/30 transition-all cursor-pointer"
                  onClick={() => onSend?.("_sys_internal_confirm_true")}
               >
                 ✅ Confirm & Execute
               </button>
               <button
                 className="flex-1 bg-red-500/20 text-red-400 font-bold text-sm py-2.5 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-all cursor-pointer"
                  onClick={() => onSend?.("_sys_internal_confirm_false")}
               >
                 ✕ Cancel
               </button>
             </>
           )}
         </div>
      </BubbleWrapper>
    );
  }

  // Style map for different message types
  const styles: Record<string, string> = {
    user: "bg-emerald-600/20 border-emerald-500/20 text-white self-end",
    system: "bg-white/[0.03] border-white/5 text-gray-400",
    "agent-activity": "bg-white/[0.03] border-white/5 text-gray-300",
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    error: "bg-red-500/10 border-red-500/20 text-red-400",
    x402: "bg-pink-500/5 border-pink-500/20 text-pink-300",
  };

  const iconMap: Record<string, string> = {
    system: "🔄",
    "agent-activity": "🤖",
    success: "✅",
    error: "❌",
    x402: "💳",
    user: "",
  };

  return (
    <BubbleWrapper message={message}>
      <div className={`rounded-xl p-4 border text-sm ${styles[message.type] || styles.system}`}>
        <div className="flex items-start gap-2.5">
          {message.type !== "user" && (
            <span className="text-base mt-0.5 shrink-0">{iconMap[message.type]}</span>
          )}
          <div className="flex-1 min-w-0">
            {message.agentName && message.type !== "user" && (
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">
                {message.agentName} {message.agentRole ? `· ${message.agentRole}` : ""}
              </span>
            )}
            <span className="whitespace-pre-wrap leading-relaxed">
              {formatBold(message.content)}
            </span>
          </div>
        </div>
      </div>
    </BubbleWrapper>
  );
}

function BubbleWrapper({
  message,
  children,
}: {
  message: ChatMessage;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`max-w-2xl ${message.type === "user" ? "ml-auto" : ""}`}
    >
      {children}
    </motion.div>
  );
}

function formatBold(text: string): React.ReactNode {
  // Split on bold, code, and URLs
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|https?:\/\/\S+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} className="font-bold text-white">
          {part.slice(2, -2)}
        </span>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="text-xs bg-white/5 px-1.5 py-0.5 rounded font-mono text-pink-300">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.match(/^https?:\/\/\S+$/)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 break-all transition-colors"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

// ============================================
// MAIN TERMINAL COMPONENT
// ============================================

export default function SovereignTerminal() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [contractStats, setContractStats] = useState<ContractStats | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null);
  const { address, isConnected, isCorrectChain, connectWallet, disconnectWallet, switchToXLayer, balance } = useWallet();

  const waitForAction = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
    });
  }, []);

  // Auto-save messages to memory whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveSession(messages);
    }
  }, [messages]);

  // Load last session on mount
  useEffect(() => {
    const lastSession = loadLastSession();
    if (lastSession && lastSession.messages.length > 0) {
      setMessages(lastSession.messages);
    }
  }, []);

  const fetchContractStats = useCallback(async () => {
    try {
      const res = await fetch("/api/contract");
      const data = await res.json();
      if (data.success) {
        setContractStats(data.data);
      }
    } catch {
      // Contract read may fail silently
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
    fetchContractStats();
    const interval = setInterval(fetchContractStats, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchContractStats]);

  const handleSend = async (command: string) => {
    if (command === "_sys_internal_confirm_true" || command === "_sys_internal_confirm_false") {
      if (confirmResolverRef.current) {
        confirmResolverRef.current(command === "_sys_internal_confirm_true");
        confirmResolverRef.current = null;
      }
      return;
    }

    if (isRunning) return;
    setIsRunning(true);
    await orchestrate(command, (msg) => {
      setActiveAgent(msg.agentName || null);
      setMessages((prev) => [...prev, msg]);
    }, address, waitForAction);
    setActiveAgent(null);
    setIsRunning(false);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isRunning) return;

    const command = input.trim();
    setInput("");
    setIsRunning(true);

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "user",
        content: command,
        timestamp: Date.now(),
      },
    ]);

    // Run orchestrator
    await orchestrate(command, (msg) => {
      setActiveAgent(msg.agentName || null);
      setMessages((prev) => [...prev, msg]);
    }, address, waitForAction);

    setActiveAgent(null);
    setIsRunning(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-screen bg-[#06060a] text-gray-100 relative overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#06060a]/80 via-transparent to-[#06060a]/80 pointer-events-none" />
      
      {/* Sidebar */}
      <div className="z-10 bg-[#0c0c16]/80 backdrop-blur-xl border-r border-white/5">
        <AgentSidebar activeAgent={activeAgent} contractStats={contractStats} walletBalance={balance} />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0c0c16]/50 backdrop-blur-2xl shrink-0">
          <div className="flex items-center gap-4">
            <SovereignLogo className="w-8 h-8" />
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-widest text-white leading-none">
                SOVEREIGN
              </h1>
              <span className="text-[10px] text-emerald-400 font-bold tracking-[0.3em] uppercase mt-1">
                Agent
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              X Layer
            </span>
            {isConnected ? (
              <div className="flex items-center gap-2">
                {!isCorrectChain && (
                  <button
                    onClick={switchToXLayer}
                    className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
                  >
                    Switch to X Layer
                  </button>
                )}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-mono text-[11px]">
                    {address!.slice(0, 6)}...{address!.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="px-2.5 py-1 rounded-lg border border-red-500/20 text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-semibold hover:from-emerald-500/30 hover:to-emerald-600/30 transition-all cursor-pointer shadow-[0_0_15px_rgba(52,211,153,0.15)] hover:shadow-[0_0_20px_rgba(52,211,153,0.25)]"
              >
                Connect Wallet
              </button>
            )}
            <button
              onClick={() => { setMessages([]); clearMemory(); }}
              className="px-2.5 py-1 rounded-lg border border-white/5 hover:border-white/15 hover:bg-white/5 transition-all cursor-pointer text-gray-500 hover:text-gray-300"
            >
              Clear
            </button>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center"
            >
              <SovereignLogo className="w-24 h-24 mb-6" />
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-black text-white tracking-widest">
                  SOVEREIGN
                </h2>
                <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                  v1.2-MEGA-SMART
                </div>
              </div>
              <div className="text-xs text-emerald-400/60 font-bold tracking-[0.3em] uppercase mb-8">
                Agent Terminal · ALPHA
              </div>
              <p className="text-gray-400 max-w-sm mb-10 text-sm leading-relaxed">
                Your AI trading crew is ready.
                <br />
                Type a command and let the agents handle the rest.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
                {[
                  { cmd: "Buy trending tokens if they are safe", icon: "🔥" },
                  { cmd: "Rebalance my portfolio", icon: "⚖️" },
                  { cmd: "Show me what smart money is buying", icon: "🐋" },
                  { cmd: "Analyze the security of my holdings", icon: "🛡️" },
                ].map(({ cmd, icon }) => (
                  <button
                    key={cmd}
                    onClick={() => {
                      setInput(cmd);
                      inputRef.current?.focus();
                    }}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/5 hover:border-emerald-500/30 bg-white/[0.02] hover:bg-emerald-500/5 text-gray-400 hover:text-emerald-400 transition-all text-left cursor-pointer group"
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">{icon}</span>
                    <span className="text-xs leading-snug">{cmd}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} onSend={handleSend} />
            ))}
          </AnimatePresence>

          {isRunning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 py-2 text-sm text-gray-500"
            >
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-xs">Agents are working...</span>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 px-6 py-4 border-t border-white/5 bg-[#0c0c16]/80 backdrop-blur-xl shrink-0"
        >
          <div className="flex-1 flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 focus-within:border-emerald-500/30 transition-all">
            <span className="text-emerald-400/60 text-sm">⚡</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRunning ? "Agents are executing..." : "What would you like to do?"}
              disabled={isRunning}
              className="flex-1 bg-transparent outline-none text-gray-200 placeholder:text-gray-600 text-sm disabled:opacity-40"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={isRunning || !input.trim()}
            className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-20 disabled:hover:bg-emerald-600 text-white text-xs font-semibold tracking-wider transition-all cursor-pointer shrink-0"
          >
            Execute
          </button>
        </form>
      </div>
    </div>
  );
}
