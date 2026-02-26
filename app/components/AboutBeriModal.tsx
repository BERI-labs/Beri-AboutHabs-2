"use client";

interface AboutBeriModalProps {
  open: boolean;
  onClose: () => void;
}

export function AboutBeriModal({ open, onClose }: AboutBeriModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0, 0, 0, 0.15)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6 animate-fade-in overflow-y-auto"
        style={{
          background: "var(--beri-bg)",
          borderColor: "var(--beri-border)",
          boxShadow: "0 20px 60px rgba(143, 163, 196, 0.2), 0 4px 16px rgba(0, 0, 0, 0.06)",
          maxHeight: "85vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2
            className="font-semibold uppercase tracking-widest"
            style={{ color: "var(--beri-text)", fontSize: "0.875rem" }}
          >
            About Beri
          </h2>
          <button
            onClick={onClose}
            aria-label="Close About Beri"
            className="w-7 h-7 flex items-center justify-center rounded-full transition-opacity hover:opacity-60"
            style={{ color: "var(--beri-text-muted)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* FAQ content */}
        <dl className="space-y-5">
          <div>
            <dt
              className="font-semibold mb-1"
              style={{ color: "var(--beri-accent-hover)", fontSize: "1.575rem" }}
            >
              What is Beri?
            </dt>
            <dd
              className="text-sm leading-relaxed"
              style={{ color: "var(--beri-text-soft)" }}
            >
              Beri is a school AI chatbot built by BERI Labs — a student-led AI
              education project. It answers questions about Haberdashers&apos;
              Boys&apos; School using a custom based AI education framework,
              with an emphasis on grounded citations.
            </dd>
          </div>

          <div>
            <dt
              className="font-semibold mb-1"
              style={{ color: "var(--beri-accent-hover)", fontSize: "1.575rem" }}
            >
              What can Beri help me with?
            </dt>
            <dd
              className="text-sm leading-relaxed"
              style={{ color: "var(--beri-text-soft)" }}
            >
              Beri covers 11+ and 13+ admissions, school fees and bursaries,
              GCSE and A-level subject choices, sports and extracurricular
              activities — all with cited sources from the school&apos;s
              knowledge base.
            </dd>
          </div>

          <div>
            <dt
              className="font-semibold mb-1"
              style={{ color: "var(--beri-accent-hover)", fontSize: "1.575rem" }}
            >
              Who built Beri?
            </dt>
            <dd
              className="text-sm leading-relaxed"
              style={{ color: "var(--beri-text-soft)" }}
            >
              Beri is one of several student-built AI tools developed by BERI
              Labs, a student-led AI education framework focused on building
              education AI infrastructure for UK schools. It is not an official
              school service — always verify critical information directly with
              the school.
            </dd>
          </div>

          <div>
            <dt
              className="font-semibold mb-1"
              style={{ color: "var(--beri-accent-hover)", fontSize: "1.575rem" }}
            >
              How does Beri work?
            </dt>
            <dd
              className="text-sm leading-relaxed"
              style={{ color: "var(--beri-text-soft)" }}
            >
              Beri uses a bespoke hybrid search method that queries the
              school&apos;s knowledge base, then generating a response grounded
              in those sources — so answers are accurate and traceable.
            </dd>
          </div>
        </dl>

        {/* Dismiss button */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-85"
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
