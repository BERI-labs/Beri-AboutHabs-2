"use client";

import { useState } from "react";
import type { SearchResult } from "../lib/types";

interface SourcePanelProps {
  sources: SearchResult[];
}

/**
 * Lightweight markdown renderer for citation text.
 * Handles: bold, italic, tables, line breaks.
 */
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect markdown table (line starting with |)
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(renderTable(tableLines, elements.length));
      continue;
    }

    // Regular line — render inline markdown
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

  // Filter out separator rows (e.g. |---|---|)
  const dataRows = lines.filter(
    (l) => !/^\|[\s\-:|]+\|$/.test(l.trim())
  );

  if (dataRows.length === 0) return null;

  const header = parseRow(dataRows[0]);
  const body = dataRows.slice(1).map(parseRow);

  return (
    <div key={key} className="overflow-x-auto my-1.5">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr>
            {header.map((cell, j) => (
              <th
                key={j}
                className="text-left px-2 py-1 border-b font-semibold"
                style={{ borderColor: "var(--beri-accent-light)", color: "var(--beri-accent-hover)" }}
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
                  className="px-2 py-1 border-b"
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
  // Split on bold (**text**) and italic (*text*) patterns
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} style={{ color: "var(--beri-text)", fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  // Sort by decreasing match percentage
  const sorted = [...sources].sort((a, b) => b.score - a.score);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs transition-colors duration-150"
        style={{ color: "var(--beri-accent)" }}
        aria-expanded={open}
      >
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span>
          {sources.length} source{sources.length !== 1 ? "s" : ""} cited
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-2 animate-fade-in">
          {sorted.map((s, i) => (
            <details
              key={i}
              className="group rounded-lg border overflow-hidden"
              style={{
                borderColor: "var(--beri-border)",
                background: "var(--beri-surface)",
              }}
            >
              <summary
                className="flex items-center gap-2 px-3 py-2 cursor-pointer text-xs transition-colors select-none list-none"
                style={{ color: "var(--beri-accent-hover)" }}
              >
                <svg
                  className="w-3 h-3 transition-transform duration-200 group-open:rotate-90 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-medium truncate">{s.chunk.title}</span>
                <span className="ml-auto text-[10px] flex-shrink-0" style={{ color: "var(--beri-text-muted)" }}>
                  {(s.score * 100).toFixed(0)}% match
                </span>
              </summary>
              <div
                className="px-3 pb-3 pt-1 text-xs leading-relaxed border-t"
                style={{ color: "var(--beri-text-soft)", borderColor: "var(--beri-border-light)" }}
              >
                {renderMarkdown(s.chunk.text)}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
