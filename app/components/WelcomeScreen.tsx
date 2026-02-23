"use client";

const STARTER_QUESTIONS = [
  "What are the school fees for Senior School?",
  "When is the 11+ registration deadline?",
  "What GCSE grades do I need for A-Level Physics?",
  "Who is the Headmaster?",
  "What were the 2025 A-Level results?",
  "How do I get financial help?",
];

interface WelcomeScreenProps {
  onQuestion: (q: string) => void;
}

export function WelcomeScreen({ onQuestion }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-4">
        <img
          src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/beri-logo.png`}
          alt="Beri"
          className="h-14 object-contain"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
            const sibling = target.nextElementSibling as HTMLElement | null;
            if (sibling) sibling.style.display = "flex";
          }}
        />
        {/* Fallback if no logo image */}
        <div
          className="hidden items-center gap-3"
          style={{ display: "none" }}
        >
          <span style={{ fontSize: 40 }}>🫐</span>
          <span
            className="text-3xl font-bold tracking-tight"
            style={{ color: "var(--beri-white)" }}
          >
            Beri
          </span>
        </div>
      </div>

      {/* Welcome message */}
      <div className="max-w-lg text-center mb-8">
        <h1
          className="text-2xl font-semibold mb-3"
          style={{ color: "var(--beri-white)" }}
        >
          Hi, I&apos;m Beri
        </h1>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--beri-white-soft)" }}
        >
          Your guide to Haberdashers&apos; Boys&apos; School. Ask me anything
          about admissions, fees, the curriculum, sport, or school life.
        </p>
      </div>

      {/* Starter chips */}
      <div className="flex flex-wrap justify-center gap-2 max-w-xl">
        {STARTER_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onQuestion(q)}
            className="starter-chip px-4 py-2.5 rounded-full text-sm border text-[#D4A843] border-[#D4A843]/40 bg-transparent"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
