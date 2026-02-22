"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { AppState, Message } from "../lib/types";
import { RAGOrchestrator } from "../lib/rag";
import { WelcomeScreen } from "./WelcomeScreen";
import { MessageList } from "./MessageList";
import { InputBar } from "./InputBar";
import { ReasoningToggle } from "./ReasoningToggle";

type WorkerStatus = "loading" | "orama-ready" | "embedder-ready" | "embedder-fallback";

export function ChatWindow() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [reasoningMode, setReasoningMode] = useState(false);
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>("loading");
  const [embedderProgress, setEmbedderProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        // Orama ready → show welcome (embedder loads in background)
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

    // Pass basePath so the worker can fetch /data/knowledge-index.json correctly
    // process.env.NEXT_PUBLIC_BASE_PATH is set by next.config.mjs via env injection
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    worker.postMessage({ type: "init", basePath: base });

    const rag = new RAGOrchestrator(worker);
    orchestratorRef.current = rag;

    return () => {
      worker.terminate();
    };
  }, [apiKeyMissing]);

  useEffect(() => {
    if (orchestratorRef.current) {
      orchestratorRef.current.setReasoningMode(reasoningMode);
    }
  }, [reasoningMode]);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!orchestratorRef.current || isStreaming) return;

      const rag = orchestratorRef.current;

      // Transition to chat
      if (appState === "welcome") {
        setAppState("chatting");
      }

      // Add user message
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: userText,
      };

      // Add placeholder assistant message
      const assistantId = crypto.randomUUID();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      let reasoningAccum = "";

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
          (reasoning) => {
            reasoningAccum = reasoning;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, reasoning: reasoningAccum, isStreaming: true }
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
                  reasoning: reasoningAccum || undefined,
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
    [appState, isStreaming],
  );

  // ── LOADING SCREEN ──────────────────────────────────────────────
  if (appState === "loading") {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-8"
        style={{ background: "var(--beri-navy)" }}
      >
        <img
          src="/beri-logo.svg"
          alt="Beri"
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
          🫐 Beri
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
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center"
        style={{ background: "var(--beri-navy)" }}
      >
        <div className="text-4xl mb-2">🫐</div>
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--beri-error)" }}
        >
          {errorMsg ?? "Beri is not configured."}
        </h1>
        <p className="text-sm" style={{ color: "var(--beri-white-soft)" }}>
          Please contact the site administrator.
        </p>
      </div>
    );
  }

  // ── MAIN CHAT UI ──────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-screen max-w-2xl mx-auto"
      style={{ background: "var(--beri-navy)" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "rgba(184, 189, 208, 0.1)" }}
      >
        <div className="flex items-center gap-2">
          <img
            src="/favicon.svg"
            alt="Beri"
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

          {/* Status indicators */}
          {workerStatus === "embedder-fallback" && (
            <span
              className="ml-2 text-xs px-2 py-0.5 rounded-full border"
              style={{
                color: "var(--beri-white-soft)",
                borderColor: "rgba(184,189,208,0.2)",
              }}
            >
              Text search
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {reasoningMode && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-[#D4A843]/40 text-[#D4A843]">
              🧠 Reasoning
            </span>
          )}
          <ReasoningToggle
            enabled={reasoningMode}
            onChange={setReasoningMode}
            disabled={isStreaming}
          />
          {messages.length > 0 && (
            <button
              onClick={() => {
                setMessages([]);
                setAppState("welcome");
                orchestratorRef.current?.resetHistory();
              }}
              disabled={isStreaming}
              title="New conversation"
              className="p-1.5 rounded-lg transition-colors hover:bg-[#1A3068] text-[#B8BDD0] hover:text-[#F0F2F7]"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
        </div>
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
        disabled={isStreaming || appState === "loading"}
        placeholder={
          workerStatus === "loading"
            ? "Loading…"
            : "Ask about admissions, fees, curriculum…"
        }
      />
    </div>
  );
}
