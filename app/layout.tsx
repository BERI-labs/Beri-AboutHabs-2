import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// SEO: canonical site URL for Open Graph and structured data
const siteUrl = "https://beri-labs.github.io/Beri-AboutHabs-2";

// SEO: optimised title (50 chars) and meta description (155 chars)
export const metadata: Metadata = {
  title: "Beri | Haberdashers' Boys' School AI Assistant",
  description:
    "Beri is a student-built AI chatbot for Haberdashers' Boys' School. Ask about admissions, fees, curriculum, sport, and school life — powered by BERI's education AI framework.",

  // SEO: canonical URL prevents duplicate-content penalties
  alternates: {
    canonical: siteUrl,
  },

  // SEO: Open Graph tags for social sharing and AI crawlers
  openGraph: {
    title: "Beri | Haberdashers' Boys' School AI Chatbot",
    description:
      "Ask Beri anything about Haberdashers' Boys' School. A student-built AI education tool by BERI Labs — admissions, fees, curriculum, sport, and school life.",
    url: siteUrl,
    siteName: "Beri — BERI Labs",
    images: [
      {
        url: `${siteUrl}/beri-logo.png`,
        width: 512,
        height: 512,
        alt: "Beri — AI chatbot for Haberdashers' Boys' School, built by BERI Labs",
      },
    ],
    type: "website",
    locale: "en_GB",
  },

  // SEO: Twitter/X card for rich link previews
  twitter: {
    card: "summary",
    title: "Beri | Haberdashers' Boys' School AI Chatbot",
    description:
      "Ask Beri anything about Haberdashers' Boys' School. A student-built AI chatbot by BERI Labs.",
    images: [`${siteUrl}/beri-logo.png`],
  },

  // SEO: allow indexing and link-following by default
  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: `${basePath}/favicon.png`,
  },
};

// SEO: JSON-LD structured data for rich results and AI answer engines
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Beri",
      alternateName: "BERI Habs Chatbot",
      description:
        "Beri is a student-built AI chatbot and school AI chatbot developed by BERI Labs as part of their education AI infrastructure. It uses retrieval-augmented generation (RAG) to answer questions about Haberdashers' Boys' School.",
      url: siteUrl,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any",
      creator: {
        "@type": "Organization",
        name: "BERI Labs",
        url: "https://beri-labs.github.io/",
        description:
          "BERI is a student-led AI education framework that designs and builds bespoke AI tools for schools, including browser-based chatbots and education AI infrastructure.",
      },
      audience: {
        "@type": "EducationalAudience",
        educationalRole: ["student", "parent", "teacher"],
      },
      about: {
        "@type": "School",
        name: "Haberdashers' Boys' School",
        alternateName: "Habs Boys",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Hertfordshire",
          addressCountry: "GB",
        },
      },
      featureList: [
        "School admissions information",
        "School fees and bursaries",
        "Curriculum and A-level guidance",
        "School life and extracurricular activities",
        "Source-cited AI answers",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Beri?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Beri is a student-built AI chatbot for Haberdashers' Boys' School, created by BERI Labs. It uses retrieval-augmented generation (RAG) to answer questions about admissions, fees, curriculum, sport, and school life — with cited sources from the school knowledge base.",
          },
        },
        {
          "@type": "Question",
          name: "What is BERI Labs?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "BERI Labs is a student-led AI education framework that builds bespoke AI tools for schools. Their work includes browser-based school chatbots, education AI infrastructure, and student-built AI tools designed to help pupils, parents, and teachers navigate school information.",
          },
        },
        {
          "@type": "Question",
          name: "What can Beri help me with?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Beri can answer questions about Haberdashers' Boys' School, including 11+ and 13+ admissions deadlines, school fees and bursaries, GCSE and A-level subject choices, sports and extracurricular activities, and general school life. Each answer includes cited sources.",
          },
        },
        {
          "@type": "Question",
          name: "Is Beri an official Haberdashers' school tool?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Beri is built by BERI Labs, a student-led AI education project, using publicly available school information. It is not an official school-operated service. Always verify important information directly with Haberdashers' Boys' School.",
          },
        },
        {
          "@type": "Question",
          name: "How does Beri work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Beri uses a fully browser-based retrieval-augmented generation (RAG) pipeline. It runs hybrid search (BM25 keyword search plus semantic vector search) in a Web Worker to find relevant knowledge base passages, then generates a response via the Groq API — all without sending your question to an external server.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* SEO: viewport and theme for mobile and browser UI */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0B1A3B" />
        <link rel="icon" href={`${basePath}/favicon.png`} type="image/png" />

        {/* SEO: JSON-LD structured data for Google rich results and AI answer engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body style={{ background: "#0B1A3B", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
