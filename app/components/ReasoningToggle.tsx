"use client";

interface ReasoningToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function ReasoningToggle({
  enabled,
  onChange,
  disabled = false,
}: ReasoningToggleProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      title={enabled ? "Disable reasoning mode" : "Enable reasoning mode"}
      aria-label={enabled ? "Reasoning mode on" : "Reasoning mode off"}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
        border transition-all duration-200
        ${
          enabled
            ? "border-[#D4A843] bg-[#D4A843]/10 text-[#D4A843]"
            : "border-[#B8BDD0]/30 bg-transparent text-[#B8BDD0] hover:border-[#D4A843]/50 hover:text-[#D4A843]/70"
        }
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <span>🧠</span>
      <span>{enabled ? "Reasoning On" : "Reasoning"}</span>
      {/* Toggle pill */}
      <span
        className={`
          relative inline-flex w-7 h-4 rounded-full transition-colors duration-200
          ${enabled ? "bg-[#D4A843]" : "bg-[#B8BDD0]/30"}
        `}
      >
        <span
          className={`
            absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200
            ${enabled ? "translate-x-3.5" : "translate-x-0.5"}
          `}
        />
      </span>
    </button>
  );
}
