"use client";

import type { Message } from "../lib/types";
import { SourcePanel } from "./SourcePanel";

interface MessageBubbleProps {
  message: Message;
}

/**
 * Lightweight markdown renderer for Beri's responses.
 * Handles: headings, bold, italic, unordered/ordered lists, tables, line breaks.
 */
function formatText(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line — spacer
    if (line.trim() === "") {
      elements.push(<br key={elements.length} />);
      i++;
      continue;
    }

    // Markdown table (line starting with |)
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(renderTable(tableLines, elements.length));
      continue;
    }

    // Heading: ### or ## or #
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const fontSize = level === 1 ? "text-base" : level === 2 ? "text-sm" : "text-sm";
      elements.push(
        <div key={elements.length} className={`${fontSize} font-semibold mt-2 mb-1`} style={{ color: "var(--beri-text)" }}>
          {renderInline(headingText)}
        </div>
      );
      i++;
      continue;
    }

    // Unordered list (- item or * item)
    if (/^\s*[-*]\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*[-*]\s+/, "");
        listItems.push(<li key={listItems.length}>{renderInline(itemText)}</li>);
        i++;
      }
      elements.push(
        <ul key={elements.length} className="list-disc pl-5 my-1 space-y-0.5">
          {listItems}
        </ul>
      );
      continue;
    }

    // Ordered list (1. item)
    if (/^\s*\d+\.\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*\d+\.\s+/, "");
        listItems.push(<li key={listItems.length}>{renderInline(itemText)}</li>);
        i++;
      }
      elements.push(
        <ol key={elements.length} className="list-decimal pl-5 my-1 space-y-0.5">
          {listItems}
        </ol>
      );
      continue;
    }

    // Regular line
    elements.push(
      <span key={elements.length}>
        {renderInline(line)}
        {i < lines.length - 1 && <br />}
      </span>
    );
    i++;
  }

  return elements;
}

/** Parse a markdown table block into a <table> element. */
function renderTable(lines: string[], key: number): React.ReactNode {
  const parseRow = (line: string) =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

  const dataRows = lines.filter(
    (l) => !/^\|[\s\-:|]+\|$/.test(l.trim())
  );

  if (dataRows.length === 0) return null;

  const header = parseRow(dataRows[0]);
  const body = dataRows.slice(1).map(parseRow);

  return (
    <div key={key} className="overflow-x-auto my-2">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {header.map((cell, j) => (
              <th
                key={j}
                className="text-left px-2 py-1.5 border-b-2 font-semibold"
                style={{ borderColor: "var(--beri-accent-light)", color: "var(--beri-text)" }}
              >
                {renderInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td
                  key={c}
                  className="px-2 py-1.5 border-b"
                  style={{ borderColor: "var(--beri-border-light)" }}
                >
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Render inline markdown: **bold** and *italic*. */
function renderInline(text: string): React.ReactNode {
  // Bold: allow single * within content (e.g. **A*–A**); italic: not preceded/followed by word char
  const parts = text.split(/(\*\*(?:[^*]|\*(?!\*))+\*\*|(?<!\w)\*[^*]+\*(?!\w))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
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
            {message.content ? formatText(message.content) : (
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
