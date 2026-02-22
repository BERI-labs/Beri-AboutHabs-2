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
          {sources.length} source{sources.length !== 1 ? "s" : ""}
        </span>
      </button>

      {open && (
        <div className="mt-2 flex flex-wrap gap-1.5 animate-fade-in">
          {sources.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-[#D4A843]/30 text-[#D4A843] bg-[#D4A843]/5"
              title={s.chunk.text.slice(0, 120) + "…"}
            >
              <span className="opacity-60">#{s.chunk.chunkIndex + 1}</span>
              <span className="max-w-[180px] truncate">{s.chunk.title}</span>
              <span className="opacity-50 text-[10px]">
                {(s.score * 100).toFixed(0)}%
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
