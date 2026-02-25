"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { AppState, Message } from "../lib/types";
import { RAGOrchestrator } from "../lib/rag";
import { WelcomeScreen } from "./WelcomeScreen";
import { MessageList } from "./MessageList";
import { InputBar } from "./InputBar";
import { WelcomeModal } from "./WelcomeModal";

type WorkerStatus = "loading" | "orama-ready" | "embedder-ready" | "embedder-fallback";

const MAX_MESSAGES_PER_CONVERSATION = 42;
const MAX_MESSAGES_PER_WINDOW = 3;
const RATE_WINDOW_MS = 8000;

export function ChatWindow() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>("loading");
  const [embedderProgress, setEmbedderProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Rate limiting
  const [messageCount, setMessageCount] = useState(0);
  const messageTimestamps = useRef<number[]>([]);

  const orchestratorRef = useRef<RAGOrchestrator | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Check API key availability at startup
  const apiKeyMissing =
    typeof window !== "undefined" &&
    !process.env.NEXT_PUBLIC_GROQ_API_KEY;

  useEffect(() => {
    if (apiKeyMissing) {
      setAppState("error");
      setErrorMsg(
        "Beri is not configured. Please contact the site administrator.",
      );
      return;
    }

    // Spin up the retrieval worker
    const worker = new Worker(
      new URL("../worker/retrieval-worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, progress } = e.data;

      if (type === "orama-ready") {
        setWorkerStatus("orama-ready");
        setAppState("welcome");
      }
      if (type === "embedder-progress") {
        setEmbedderProgress(progress ?? 0);
      }
      if (type === "embedder-ready") {
        setWorkerStatus("embedder-ready");
      }
      if (type === "embedder-fallback") {
        setWorkerStatus("embedder-fallback");
      }
    };

    worker.onerror = (err) => {
      console.error("Retrieval worker error:", err);
    };

    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    worker.postMessage({ type: "init", basePath: base });

    const rag = new RAGOrchestrator(worker);
    orchestratorRef.current = rag;

    return () => {
      worker.terminate();
    };
  }, [apiKeyMissing]);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!orchestratorRef.current || isStreaming) return;

      // Rate limit: max messages per conversation
      if (messageCount >= MAX_MESSAGES_PER_CONVERSATION) {
        const rateLimitMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "You have reached the maximum number of messages for this conversation. Please take time to read through the responses provided. If you need further help, refresh the page to start a new conversation.",
        };
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "user", content: userText },
          rateLimitMsg,
        ]);
        return;
      }

      // Rate limit: max messages per time window
      const now = Date.now();
      const recentTimestamps = messageTimestamps.current.filter(
        (t) => now - t < RATE_WINDOW_MS,
      );
      if (recentTimestamps.length >= MAX_MESSAGES_PER_WINDOW) {
        const rateLimitMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "You are sending messages too quickly. Please slow down and read through the responses before asking another question. Beri is here to help, not to be stress-tested.",
        };
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "user", content: userText },
          rateLimitMsg,
        ]);
        return;
      }

      messageTimestamps.current = [...recentTimestamps, now];
      setMessageCount((c) => c + 1);

      const rag = orchestratorRef.current;

      if (appState === "welcome") {
        setAppState("chatting");
      }

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: userText,
      };

      const assistantId = crypto.randomUUID();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      try {
        const { fullText, sources } = await rag.ask(
          userText,
          (text) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: text, isStreaming: true }
                  : m,
              ),
            );
          },
        );

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: fullText,
                  sources,
                  isStreaming: false,
                }
              : m,
          ),
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: msg,
                  isStreaming: false,
                }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [appState, isStreaming, messageCount],
  );

  // ── LOADING SCREEN ──────────────────────────────────────────────
  if (appState === "loading") {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-8"
        style={{ background: "var(--beri-navy)" }}
        role="status"
        aria-label="Loading Beri — Haberdashers' Boys' School AI assistant"
      >
        {/* SEO: descriptive alt text for the loading screen logo */}
        <img
          src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/beri-logo.png`}
          alt="Beri — AI assistant for Haberdashers' Boys' School"
          className="h-16 object-contain"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
          }}
        />
        <div
          className="hidden text-3xl font-bold"
          style={{ color: "var(--beri-white)" }}
        >
          Beri
        </div>

        <div className="w-64 flex flex-col gap-2">
          <div
            className="text-xs text-center"
            style={{ color: "var(--beri-white-soft)" }}
          >
            Loading knowledge base…
          </div>
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ background: "var(--beri-navy-light)", height: 3 }}
          >
            <div
              className="beri-progress-bar"
              style={{
                width:
                  workerStatus === "loading"
                    ? `${Math.max(5, embedderProgress)}%`
                    : "100%",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR SCREEN ──────────────────────────────────────────────
  if (appState === "error") {
    return (
      <main
        className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center"
        style={{ background: "var(--beri-navy)" }}
        aria-label="Error"
      >
        <div className="text-4xl mb-2" aria-hidden="true">🫐</div>
        {/* SEO: H1 on error screen — only shown when no other content is displayed */}
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--beri-error)" }}
        >
          {errorMsg ?? "Beri is not configured."}
        </h1>
        <p className="text-sm" style={{ color: "var(--beri-white-soft)" }}>
          Please contact the site administrator.
        </p>
      </main>
    );
  }

  // ── MAIN CHAT UI ──────────────────────────────────────────────
  return (
    // SEO: use <main> landmark for accessibility and crawler content discovery
    //
    // Fix: welcome state uses min-h-screen (page/body scrolls freely) while
    // chat state keeps h-screen so the InputBar stays pinned at the bottom.
    // A fixed h-screen in welcome mode trapped scroll in the WelcomeScreen's
    // inner overflow-y:auto container, causing scroll lock on Windows touch.
    <main
      className={`flex flex-col ${appState === "welcome" ? "min-h-screen" : "h-screen"} max-w-4xl mx-auto`}
      style={{ background: "var(--beri-navy)" }}
    >
      {/* First-visit welcome modal */}
      <WelcomeModal />

      {/* SEO: <header> landmark with descriptive logo alt text */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "rgba(184, 189, 208, 0.1)" }}
      >
        <a
          href="https://beri-labs.github.io/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="BERI Labs — student-built AI tools for education"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {/* SEO: descriptive alt text for header logo */}
          <img
            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/favicon.png`}
            alt="BERI Labs logo"
            className="w-7 h-7 rounded-full border border-[#D4A843]/30"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div>
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--beri-white)" }}
            >
              Beri
            </span>
            <span
              className="ml-2 text-xs"
              style={{ color: "var(--beri-white-soft)" }}
            >
              Habs Boys AI Assistant
            </span>
          </div>
        </a>
      </header>

      {/* Content */}
      {appState === "welcome" ? (
        <WelcomeScreen onQuestion={sendMessage} />
      ) : (
        <MessageList messages={messages} />
      )}

      {/* Input */}
      <InputBar
        onSend={sendMessage}
        disabled={isStreaming || workerStatus === "loading"}
        placeholder={
          workerStatus === "loading"
            ? "Loading…"
            : "Ask about admissions, fees, curriculum…"
        }
      />
    </main>
  );
}
