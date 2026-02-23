"use client";

import type { Message } from "../lib/types";
import { SourcePanel } from "./SourcePanel";

interface MessageBubbleProps {
  message: Message;
}

function formatText(text: string): React.ReactNode {
  // Very lightweight formatting: bold **text**, newlines → <br>
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={i}>
        {parts.map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 animate-slide-up">
        <div
          className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed"
          style={{
            background: "var(--beri-user-bubble)",
            color: "var(--beri-white)",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 mb-4 animate-slide-up">
      {/* Beri avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden border border-[#D4A843]/40 mt-0.5">
        <img
          src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/favicon.png`}
          alt="Beri"
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
            const parent = target.parentElement!;
            parent.innerHTML = '<span style="font-size:16px;display:flex;align-items:center;justify-content:center;height:100%;width:100%">🫐</span>';
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        {/* Message bubble */}
        <div
          className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed border-l-2"
          style={{
            background: "var(--beri-surface)",
            color: "var(--beri-white)",
            borderColor: "var(--beri-gold)",
          }}
        >
          <div className={`beri-prose ${message.isStreaming ? "beri-cursor" : ""}`}>
            {message.content ? formatText(message.content) : (
              <span className="text-[#B8BDD0]">Thinking…</span>
            )}
          </div>
        </div>

        {/* Sources */}
        {!message.isStreaming && message.sources && message.sources.length > 0 && (
          <SourcePanel sources={message.sources} />
        )}
      </div>
    </div>
  );
}
