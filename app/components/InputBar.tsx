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
      style={{ background: "var(--beri-navy)" }}
    >
      <div
        className="flex items-end gap-2 rounded-2xl border px-4 py-3 transition-colors duration-150"
        style={{
          background: "var(--beri-surface)",
          borderColor: canSend ? "var(--beri-gold)/60" : "rgba(184, 189, 208, 0.15)",
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
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-[#B8BDD0]/50 text-[#F0F2F7] leading-relaxed"
          style={{ maxHeight: "120px" }}
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={`
            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
            transition-all duration-150
            ${
              canSend
                ? "bg-[#D4A843] text-[#0B1A3B] hover:bg-[#E8C96A] cursor-pointer"
                : "bg-[#B8BDD0]/10 text-[#B8BDD0]/30 cursor-not-allowed"
            }
          `}
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

      <p className="text-center text-[10px] text-[#B8BDD0]/30 mt-2">
        Beri may make mistakes. Verify important information with the school.
      </p>
    </div>
  );
}
