"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "beri-welcome-seen";

export function WelcomeModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (e.g. incognito on some browsers)
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0, 0, 0, 0.15)" }}>
      <div
        className="w-full max-w-md rounded-2xl border p-6 animate-fade-in"
        style={{
          background: "var(--beri-bg)",
          borderColor: "var(--beri-border)",
          boxShadow: "0 20px 60px rgba(143, 163, 196, 0.2), 0 4px 16px rgba(0, 0, 0, 0.06)",
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img
            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/beri-logo.png`}
            alt="Beri"
            className="h-12 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>

        <h2
          className="text-xl font-semibold text-center mb-2"
          style={{ color: "var(--beri-text)" }}
        >
          Welcome to Beri
        </h2>

        <p
          className="text-sm text-center mb-5 leading-relaxed"
          style={{ color: "var(--beri-text-soft)" }}
        >
          Your AI assistant for Haberdashers&apos; Boys&apos; School
        </p>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <span
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
              style={{ background: "var(--beri-accent)", color: "#ffffff" }}
            >
              1
            </span>
            <p className="text-sm" style={{ color: "var(--beri-text-soft)" }}>
              <strong style={{ color: "var(--beri-text)" }}>Ask a question</strong> — type
              anything about admissions, fees, the curriculum, sport, or school life.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
              style={{ background: "var(--beri-accent)", color: "#ffffff" }}
            >
              2
            </span>
            <p className="text-sm" style={{ color: "var(--beri-text-soft)" }}>
              <strong style={{ color: "var(--beri-text)" }}>Read the response</strong> — Beri
              searches the school knowledge base and gives you a concise answer.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
              style={{ background: "var(--beri-accent)", color: "#ffffff" }}
            >
              3
            </span>
            <p className="text-sm" style={{ color: "var(--beri-text-soft)" }}>
              <strong style={{ color: "var(--beri-text)" }}>Check the sources</strong> — expand
              the cited sources below each answer to verify the information yourself.
            </p>
          </div>
        </div>

        <p
          className="text-xs text-center mb-5 leading-relaxed"
          style={{ color: "var(--beri-text-muted)" }}
        >
          Beri is an AI and may occasionally make mistakes. Always verify
          important information with the school directly.
        </p>

        <button
          onClick={dismiss}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{
            background: "var(--beri-accent)",
            color: "#ffffff",
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
