"use client";

import { useRef, useState, useEffect } from "react";

interface InputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function InputBar({
  onSend,
  disabled = false,
  placeholder = "Ask about admissions, fees, curriculum…",
}: InputBarProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [value]);

  const canSend = value.trim().length > 0 && !disabled;

  const handleSend = () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="px-4 pb-4 pt-2"
      style={{ background: "var(--beri-bg)" }}
    >
      <div
        className="flex items-end gap-2 rounded-2xl border px-4 py-3 transition-all duration-150"
        style={{
          background: "var(--beri-bg)",
          borderColor: canSend ? "var(--beri-accent)" : "var(--beri-border)",
          boxShadow: canSend
            ? "0 2px 12px var(--beri-shadow)"
            : "0 1px 4px var(--beri-shadow)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed"
          style={{
            maxHeight: "120px",
            color: "var(--beri-text)",
          }}
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150"
          style={{
            background: canSend ? "var(--beri-accent)" : "var(--beri-accent-light)",
            color: canSend ? "#ffffff" : "var(--beri-text-muted)",
            cursor: canSend ? "pointer" : "not-allowed",
            boxShadow: canSend ? "0 2px 8px var(--beri-shadow)" : "none",
          }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </button>
      </div>

      <p className="text-center text-[10px] mt-2" style={{ color: "var(--beri-text-muted)" }}>
        Beri may make mistakes. Verify important information with the school.
      </p>
    </div>
  );
}
