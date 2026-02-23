"use client";

import { useState } from "react";
import type { SearchResult } from "../lib/types";

interface SourcePanelProps {
  sources: SearchResult[];
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-[#D4A843]/70 hover:text-[#D4A843] transition-colors duration-150"
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
          {sources.map((s, i) => (
            <details
              key={i}
              className="group rounded-lg border border-[#D4A843]/20 bg-[#D4A843]/5 overflow-hidden"
            >
              <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer text-xs text-[#D4A843] hover:bg-[#D4A843]/10 transition-colors select-none list-none">
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
                <span className="ml-auto opacity-50 text-[10px] flex-shrink-0">
                  {(s.score * 100).toFixed(0)}% match
                </span>
              </summary>
              <div className="px-3 pb-3 pt-1 text-xs leading-relaxed text-[#B8BDD0] border-t border-[#D4A843]/10">
                {s.chunk.text}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
