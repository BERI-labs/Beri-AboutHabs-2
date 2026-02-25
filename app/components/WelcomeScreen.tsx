"use client";

import { useEffect } from "react";

// Set to true locally to see scroll diagnostics in the console.
// Never commit as true.
const DEBUG_SCROLL = false;

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
  useEffect(() => {
    if (!DEBUG_SCROLL) return;

    const report = () => {
      const html = document.documentElement;
      const body = document.body;
      const main = document.querySelector("main");
      console.log("[scroll-debug]", {
        "window.scrollY": window.scrollY,
        "scrollingEl.scrollTop": document.scrollingElement?.scrollTop,
        html_overflow: getComputedStyle(html).overflow,
        html_height: getComputedStyle(html).height,
        body_overflow: getComputedStyle(body).overflow,
        body_height: getComputedStyle(body).height,
        main_overflow: main ? getComputedStyle(main).overflow : "n/a",
        main_height: main ? getComputedStyle(main).height : "n/a",
        center_el: document.elementFromPoint(
          window.innerWidth / 2,
          window.innerHeight / 2,
        )?.tagName,
      });
    };

    const onWheel = (e: WheelEvent) => {
      report();
      if (e.defaultPrevented)
        console.warn("[scroll-debug] wheel defaultPrevented by", e.target);
    };
    const onTouch = (e: TouchEvent) => {
      report();
      if (e.defaultPrevented)
        console.warn("[scroll-debug] touchmove defaultPrevented by", e.target);
    };

    window.addEventListener("wheel", onWheel, { capture: true, passive: true });
    window.addEventListener("touchmove", onTouch, {
      capture: true,
      passive: true,
    });
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchmove", onTouch, { capture: true });
    };
  }, []);

  return (
    // overflow-y-auto removed: parent <main> uses min-h-screen in welcome
    // state so the page/body scrolls rather than this inner container.
    // Eliminating the nested scroller fixes the touch/trackpad "stuck at
    // bottom" bug on Windows Surface, Edge, and Chrome.
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-4">
        {/* SEO: descriptive alt text for the logo image */}
        <img
          src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/beri-logo.png`}
          alt="Beri — student-built AI chatbot for Haberdashers' Boys' School by BERI Labs"
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
        {/* SEO: single H1 that is clear and keyword-relevant */}
        <h1
          className="text-2xl font-semibold mb-3"
          style={{ color: "var(--beri-white)" }}
        >
          Hi, I&apos;m Beri
        </h1>

        {/* SEO/GEO: intro paragraph explains what BERI is with natural keywords for AI engines */}
        <p
          className="text-sm leading-relaxed mb-3"
          style={{ color: "var(--beri-white-soft)" }}
        >
          Your AI guide to Haberdashers&apos; Boys&apos; School — ask me
          anything about admissions, fees, the curriculum, sport, or school
          life.
        </p>

        {/* GEO: "What is Beri?" paragraph optimised for AI summaries and answer boxes */}
        <p
          className="text-xs leading-relaxed"
          style={{ color: "var(--beri-white-soft)", opacity: 0.75 }}
        >
          Beri is a student-built AI tool created by{" "}
          <a
            href="https://beri-labs.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--beri-gold)", textDecoration: "underline" }}
          >
            BERI Labs
          </a>
          {" "}— a student-led AI education framework that builds bespoke AI
          tools for schools. It uses retrieval-augmented generation to deliver
          cited, accurate answers from the school knowledge base.
        </p>
      </div>

      {/* Starter chips */}
      <div
        className="flex flex-wrap justify-center gap-2 max-w-xl mb-10"
        aria-label="Suggested questions"
      >
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

      {/* GEO: FAQ section — structured for AI answer engines and featured snippets */}
      <section
        aria-label="Frequently asked questions about Beri"
        className="max-w-2xl w-full"
      >
        {/* SEO: H2 for FAQ section — correct heading hierarchy (H1 → H2) */}
        <h2
          className="text-sm font-semibold uppercase tracking-widest text-center mb-4"
          style={{ color: "var(--beri-white-soft)", opacity: 0.5 }}
        >
          About Beri
        </h2>

        <dl className="space-y-4">
          {/* GEO: each dt/dd pair is a concise Q&A that AI engines can quote directly */}
          <div>
            <dt
              className="text-sm font-semibold mb-1"
              style={{ color: "var(--beri-gold)" }}
            >
              What is Beri?
            </dt>
            <dd
              className="text-sm leading-relaxed"
              style={{ color: "var(--beri-white-soft)", opacity: 0.75 }}
            >
              Beri is a school AI chatbot built by BERI Labs — a student-led AI
              education project. It answers questions about Haberdashers&apos;
              Boys&apos; School using a browser-based AI education framework
              that runs entirely on your device, with no data sent to external
              servers.
            </dd>
          </div>

          <div>
            <dt
              className="text-sm font-semibold mb-1"
              style={{ color: "var(--beri-gold)" }}
            >
              What can Beri help me with?
            </dt>
            <dd
              className="text-sm leading-relaxed"
              style={{ color: "var(--beri-white-soft)", opacity: 0.75 }}
            >
              Beri covers 11+ and 13+ admissions, school fees and bursaries,
              GCSE and A-level subject choices, sports and extracurricular
              activities, and general school policies — all with cited sources
              from the school knowledge base.
            </dd>
          </div>

          <div>
            <dt
              className="text-sm font-semibold mb-1"
              style={{ color: "var(--beri-gold)" }}
            >
              Who built Beri?
            </dt>
            <dd
              className="text-sm leading-relaxed"
              style={{ color: "var(--beri-white-soft)", opacity: 0.75 }}
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
              className="text-sm font-semibold mb-1"
              style={{ color: "var(--beri-gold)" }}
            >
              How does Beri work?
            </dt>
            <dd
              className="text-sm leading-relaxed"
              style={{ color: "var(--beri-white-soft)", opacity: 0.75 }}
            >
              Beri uses retrieval-augmented generation (RAG): it searches a
              curated school knowledge base using hybrid keyword and semantic
              search, then generates a response grounded in those sources —
              so answers are accurate and traceable.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
