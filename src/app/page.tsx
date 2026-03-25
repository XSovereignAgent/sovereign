"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SovereignTerminal from "@/components/SovereignTerminal";
import { Zap, ShieldCheck, Activity } from "lucide-react";

export default function Home() {
  const [isLaunched, setIsLaunched] = useState(false);

  return (
    <div className="bg-[#05050A] text-white overflow-hidden min-h-screen relative font-sans">
      <AnimatePresence mode="wait">
        {!isLaunched ? (
          <motion.div 
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6 z-50 bg-[#05050A]"
          >
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
            
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="max-w-3xl w-full text-center relative z-10"
            >
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <span className="text-4xl text-emerald-400 font-bold tracking-tighter shrink-0">X</span>
                </div>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                  X-Sovereign
                </span>
              </h1>
              
              <h2 className="text-xl md:text-2xl text-gray-300 font-light tracking-wide mb-8">
                Autonomous On-Chain AI Trading Network
              </h2>

              <p className="text-base text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                By intelligently routing natural language intents, X-Sovereign leverages a specialized 
                marketplace of on-chain agents to discover smart money trends, audit contract security, 
                and securely execute transactions on X Layer via the X402 payment protocol.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-6 mb-16">
                <div className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Live Trending Data
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  On-Chain Secruity
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  X402 Agent Payments
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsLaunched(true)}
                className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white bg-emerald-500 border border-emerald-400 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] cursor-pointer"
              >
                <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-white rounded-full group-hover:w-56 group-hover:h-56 opacity-10"></span>
                <span className="relative flex items-center gap-2 text-lg">
                  Launch App
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </motion.button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="terminal"
            initial={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="w-full h-full min-h-screen"
          >
            <SovereignTerminal />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
