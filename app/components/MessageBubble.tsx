"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../lib/types";
import { SourcePanel } from "./SourcePanel";

interface MessageBubbleProps {
  message: Message;
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
            color: "var(--beri-text)",
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
      <div
        className="flex-shrink-0 w-7 h-7 overflow-hidden mt-0.5"
      >
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
          className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed"
          style={{
            background: "var(--beri-surface)",
            color: "var(--beri-text)",
            boxShadow: "0 2px 12px var(--beri-shadow)",
            borderLeft: "2px solid var(--beri-accent)",
          }}
        >
          <div className={`beri-prose ${message.isStreaming ? "beri-cursor" : ""}`}>
            {message.content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <div className="text-base font-semibold mt-2 mb-1" style={{ color: "var(--beri-text)" }}>{children}</div>
                  ),
                  h2: ({ children }) => (
                    <div className="text-sm font-semibold mt-2 mb-1" style={{ color: "var(--beri-text)" }}>{children}</div>
                  ),
                  h3: ({ children }) => (
                    <div className="text-sm font-semibold mt-2 mb-1" style={{ color: "var(--beri-text)" }}>{children}</div>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-2">
                      <table className="w-full text-xs border-collapse">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead>{children}</thead>,
                  tbody: ({ children }) => <tbody>{children}</tbody>,
                  th: ({ children }) => (
                    <th
                      className="text-left px-2 py-1.5 border-b-2 font-semibold"
                      style={{ borderColor: "var(--beri-accent-light)", color: "var(--beri-text)" }}
                    >
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-2 py-1.5 border-b" style={{ borderColor: "var(--beri-border-light)" }}>
                      {children}
                    </td>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-5 my-1 space-y-0.5">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-5 my-1 space-y-0.5">{children}</ol>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium underline"
                      style={{ color: "var(--beri-accent-hover)" }}
                    >
                      {children}
                      <svg className="w-3 h-3 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  ),
                  strong: ({ children }) => <strong>{children}</strong>,
                  em: ({ children }) => <em>{children}</em>,
                  p: ({ children }) => <p className="mb-1">{children}</p>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <span style={{ color: "var(--beri-text-muted)" }}>Thinking…</span>
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
