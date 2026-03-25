// ============================================
// X-Sovereign Agent Memory
// Persistent conversation storage via localStorage
// ============================================

import { ChatMessage } from "./orchestrator";

const STORAGE_KEY = "xsov_memory";
const MAX_SESSIONS = 20;

export interface MemorySession {
  id: string;
  timestamp: number;
  firstCommand: string;
  messages: ChatMessage[];
}

export function saveSession(messages: ChatMessage[]): void {
  if (typeof window === "undefined" || messages.length === 0) return;

  const userMessages = messages.filter((m) => m.type === "user");
  if (userMessages.length === 0) return;

  const sessions = getAllSessions();
  const session: MemorySession = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    firstCommand: userMessages[0].content,
    messages,
  };

  sessions.unshift(session);
  // Keep only the last MAX_SESSIONS
  const trimmed = sessions.slice(0, MAX_SESSIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function getAllSessions(): MemorySession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function loadLastSession(): MemorySession | null {
  const sessions = getAllSessions();
  return sessions.length > 0 ? sessions[0] : null;
}

export function getMemorySummary(): string {
  const sessions = getAllSessions();
  if (sessions.length === 0) return "";

  // Build a concise summary of recent actions for the agent
  const recent = sessions.slice(0, 5);
  const lines = recent.map((s) => {
    const date = new Date(s.timestamp).toLocaleDateString();
    const successMsgs = s.messages.filter((m) => m.type === "success");
    const summary = successMsgs.length > 0 ? successMsgs[0].content : s.firstCommand;
    return `[${date}] ${summary}`;
  });

  return `Previous sessions:\n${lines.join("\n")}`;
}

export function clearMemory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
