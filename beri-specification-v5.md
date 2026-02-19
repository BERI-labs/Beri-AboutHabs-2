# Beri — Technical Specification v5

**Hybrid RAG for Haberdashers' Boys' School, powered by Groq**

---

## 1. Overview

Beri is a browser-based AI assistant for Haberdashers' Boys' School (Habs Boys). It uses the Groq API with `openai/gpt-oss-20b` for generation and Orama + Transformers.js for local hybrid retrieval (BM25 + vector search). Retrieval happens entirely client-side. Only the final prompt (with retrieved context injected) is sent to Groq for inference.

| Spec | Value |
|------|-------|
| LLM | `openai/gpt-oss-20b` via Groq API |
| Groq inference speed | ~1,000 tokens/sec |
| Groq pricing | $0.10/M input, $0.50/M output |
| Embedder | all-MiniLM-L6-v2 via Transformers.js (ONNX/WASM, ~23 MB) |
| Search engine | Orama (<2 KB, JS-native, hybrid BM25 + vector) |
| Hybrid weights | α = 0.4 (40% vector, 60% text) |
| Reasoning mode | Off by default; user toggle (uses `include_reasoning`) |
| Temperature | 0.3 |
| max_completion_tokens | 512 |
| Target total response | < 2 seconds (Groq hardware inference) |
| Authentication | User provides their own Groq API key |

### 1.1 What Changed from v4

v4 used WebLLM (in-browser inference via WebGPU). This worked well on laptops but was impractical on phones — 350 MB model download, no WebGPU on older iOS, slow decode on mobile GPUs. Switching to the Groq API eliminates all of these problems:

- **No model download.** The user's browser never downloads LLM weights. First visit is instant.
- **Works on every device.** Phones, tablets, old laptops, Chromebooks — anything with a browser.
- **Massively faster inference.** Groq's LPU hardware generates ~1,000 tokens/sec. A typical 80-token answer completes in ~80ms of generation time, plus ~100-200ms network round-trip. Total: under 1 second.
- **Better model quality.** GPT-OSS 20B (MoE, 3.6B active parameters) is significantly smarter than Qwen3-0.6B. Answers will be more accurate, more natural, and better at following the system prompt.

The tradeoff: Beri now requires an internet connection and a Groq API key. It is no longer fully offline. Retrieval (Orama + embeddings) remains fully client-side.

---

## 2. Brand & UI Theme

*Unchanged from v4. Full details in v4 §2.*

Dark navy dominant (`#0B1A3B`), gold accent (`#D4A843`), white text (`#F0F2F7`). No light mode. `beri-logo.png` on loading/welcome. `favicon.png` as assistant avatar. Assistant bubbles with gold left-border.

### 2.1 Application States

**API KEY ENTRY** — First screen the user sees if no API key is stored. Full-screen navy with centred logo. Below: a text input for the Groq API key, a "Get a free API key" link to `https://console.groq.com/keys`, and a "Save & Start" button. The key is stored in `localStorage` (never sent anywhere except to `api.groq.com`). A brief explanation: "Beri uses the Groq API for fast AI responses. Your API key is stored locally in your browser and only used to communicate with Groq's servers."

**LOADING EMBEDDER** — Brief screen (~1–3s on first visit) while Transformers.js loads the embedding model (~23 MB). Gold progress bar. On return visits, this loads from cache in <500ms.

**WELCOME** — Logo in header. Welcome message. 6–8 starter question chips (gold-outlined pills). Reasoning-mode toggle in settings. Small "API key: ●●●●...abc" indicator with a "Change" button.

**CHATTING** — Standard chat. Streaming with blinking gold cursor. Collapsible "Sources" section after each response showing retrieved chunk titles + scores.

**REASONING MODE ACTIVE** — Gold "🧠 Reasoning" badge. Groq returns reasoning in a separate `reasoning` field — displayed in a collapsible accordion above the final answer.

---

## 3. Dataset

*Unchanged from v4.* Source: `Haberdashers_Boys_School_Dataset_Improved.md`. 34 sections, ~2,966 words. A-Level results verified from official PDFs (2025: 46.52% A*, 78.91% A*–A).

---

## 4. Retrieval: Hybrid Search with Orama

*Unchanged from v4.* Orama with hybrid BM25 + vector search, α = 0.4 (60% text, 40% vector). Pre-computed 384-dim embeddings from all-MiniLM-L6-v2. Top-K = 2. Chunks sorted by `chunkIndex` for stable prompt ordering. Fulltext-only fallback if the embedder fails to load. Full details in v4 §4.

---

## 5. Embedding: Transformers.js + all-MiniLM-L6-v2

*Unchanged from v4.* Runs locally in a Web Worker on CPU via WASM. ~23 MB ONNX model, ~20–30ms per-query embedding. Pre-computed chunk embeddings at build time (~52 KB). Full details in v4 §5.

---

## 6. Context Window & Prompt Budget

GPT-OSS 20B supports 131K context. This removes the tight 2048-token budget from v4 entirely. However, Beri should still keep prompts lean — shorter prompts mean faster prefill on Groq and lower cost.

| Component | Tokens | Notes |
|-----------|--------|-------|
| System prompt | ~90 | Slightly richer than v4 (better model can follow more detail) |
| Retrieved chunks (top 2) | ~200–300 | 2 chunks, avg ~113 tokens each |
| User question | ~30–50 | |
| Conversation history (last 3 turns) | ~300–600 | Can afford more history now |
| **Total input** | **~620–1,040** | |
| max_completion_tokens | 512 | Safety cap; most answers stop at 60–150 tokens |

With 131K context available, we can now keep 3 prior turns of conversation history (up from 1 in v4). This gives much better conversational continuity for follow-up questions.

---

## 7. System Prompt

```
You are Beri, the AI assistant for Haberdashers' Boys' School (Habs Boys) in Elstree, Hertfordshire. Answer questions using ONLY the provided context. Quote exact figures for dates, fees, percentages, and grades. If the context doesn't contain the answer, say "I don't have that information — please contact the school directly at 020 8266 1700 or admissionsboys@habselstree.org.uk." Keep answers to 1–3 sentences unless the question requires more detail.
```

~90 tokens. The richer system prompt takes advantage of GPT-OSS 20B's stronger instruction-following compared to Qwen3-0.6B. The fallback message now includes the school's actual contact details, which is more helpful than a generic "I don't know."

Reasoning mode is controlled via the `include_reasoning` parameter on the API call, not via prompt tokens.

---

## 8. LLM: Groq API with GPT-OSS 20B

### 8.1 Why Groq + GPT-OSS 20B

**Groq's LPU hardware** delivers ~1,000 tokens/second for GPT-OSS 20B — roughly 20× faster than a mid-range laptop running Qwen3-0.6B via WebLLM. An 80-token answer generates in ~80ms. With network round-trip, the user sees a complete response in under 2 seconds.

**GPT-OSS 20B** is an OpenAI open-weight MoE model with 20B total parameters (3.6B active per forward pass). It is dramatically more capable than Qwen3-0.6B at following instructions, grounding answers in context, and producing natural language. Key specs:

- 131K context window
- MoE architecture (32 experts, top-4 routing)
- Reasoning mode with variable effort (low/medium/high)
- OpenAI-compatible chat completions API
- $0.10 per million input tokens, $0.50 per million output tokens

**Cost estimate for Beri:** A typical query uses ~800 input tokens and ~100 output tokens. That's $0.00013 per query. At 1,000 queries/month (heavy school usage), the total cost is ~$0.13/month. Effectively free.

### 8.2 API Integration

Groq's API is OpenAI-compatible. The integration is a single `fetch` call with streaming:

```typescript
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface GroqStreamOptions {
  apiKey: string;
  messages: Array<{ role: string; content: string }>;
  includeReasoning?: boolean;
  onChunk: (text: string) => void;
  onReasoning?: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function streamGroqCompletion({
  apiKey,
  messages,
  includeReasoning = false,
  onChunk,
  onReasoning,
  onDone,
  onError,
}: GroqStreamOptions): Promise<void> {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages,
        temperature: 0.3,
        max_completion_tokens: 512,
        stream: true,
        include_reasoning: includeReasoning,
        reasoning_effort: "low",  // Keep reasoning fast for school Q&A
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Groq API error: ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const data = line.slice(6); // Remove "data: "
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;

          if (delta?.content) {
            fullText += delta.content;
            onChunk(fullText);
          }

          // GPT-OSS reasoning comes in a separate field
          if (delta?.reasoning && onReasoning) {
            onReasoning(delta.reasoning);
          }
        } catch {
          // Skip malformed SSE chunks
        }
      }
    }

    onDone(fullText);
  } catch (e) {
    onError(e instanceof Error ? e : new Error(String(e)));
  }
}
```

This is the entire LLM integration. No workers, no WASM, no WebGPU, no 350 MB downloads. A single `fetch` with SSE streaming.

### 8.3 API Key Management

The user provides their own Groq API key. It is stored in `localStorage` and included in the `Authorization` header on each request. It is never sent anywhere except `api.groq.com`.

```typescript
const API_KEY_STORAGE = "beri-groq-api-key";

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE);
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE);
}

export async function validateApiKey(key: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
```

**API Key Entry screen UX:**
1. User arrives at Beri. If no key in `localStorage`, show the API key entry screen.
2. Input field with a "paste" affordance. Link: "Get a free API key at console.groq.com/keys".
3. On submit, call `validateApiKey()`. If valid, store and proceed. If invalid, show error.
4. Once stored, the user never sees this screen again unless they clear their key.
5. A small "API Key" button in the settings area lets the user change or remove their key.

### 8.4 Reasoning Mode

GPT-OSS 20B supports variable reasoning via the `include_reasoning` and `reasoning_effort` parameters. This replaces Qwen3's `/think`/`/nothink` prompt tokens.

- **Default (reasoning off):** `include_reasoning: false`. The model answers directly. Fast.
- **Reasoning on:** `include_reasoning: true`, `reasoning_effort: "low"`. The model reasons step-by-step. Reasoning content is returned in a separate `reasoning` field in the response, not in the main `content`. The UI shows it in a collapsible "Reasoning" accordion above the answer.

The `"low"` reasoning effort is appropriate for school Q&A — the questions don't require deep multi-step reasoning. If testing shows benefit, this can be bumped to `"medium"`.

### 8.5 Error Handling

```typescript
// Common Groq API errors and how Beri handles them:

// 401 Unauthorized — invalid API key
// → Show: "Your API key is invalid. Please check it in Settings."

// 429 Rate Limited — too many requests
// → Show: "Beri is being used too quickly. Please wait a moment."
// → Groq free tier: 30 requests/minute, 14,400/day (generous for school use)

// 503 Service Unavailable — Groq is down
// → Show: "The AI service is temporarily unavailable. Please try again."

// Network error — user is offline
// → Show: "Beri needs an internet connection for AI responses."
```

---

## 9. RAG Orchestrator

The orchestrator coordinates between the local retrieval worker and the Groq API.

```typescript
import { streamGroqCompletion } from "./groq";
import { getApiKey } from "./api-key";

const SYSTEM_PROMPT = `You are Beri, the AI assistant for Haberdashers' Boys' School (Habs Boys) in Elstree, Hertfordshire. Answer questions using ONLY the provided context. Quote exact figures for dates, fees, percentages, and grades. If the context doesn't contain the answer, say "I don't have that information — please contact the school directly at 020 8266 1700 or admissionsboys@habselstree.org.uk." Keep answers to 1–3 sentences unless the question requires more detail.`;

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface SearchResult {
  chunk: { title: string; text: string; chunkIndex: number };
  score: number;
}

export class RAGOrchestrator {
  private retrievalWorker: Worker;
  private history: Message[] = [];
  private reasoningMode: boolean = false;

  constructor(retrievalWorker: Worker) {
    this.retrievalWorker = retrievalWorker;
  }

  setReasoningMode(enabled: boolean) {
    this.reasoningMode = enabled;
  }

  async search(query: string): Promise<SearchResult[]> {
    return new Promise((resolve) => {
      const id = crypto.randomUUID();
      const handler = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.retrievalWorker.removeEventListener("message", handler);
          resolve(e.data.results);
        }
      };
      this.retrievalWorker.addEventListener("message", handler);
      this.retrievalWorker.postMessage({ type: "search", query, id });
    });
  }

  buildMessages(userQuery: string, sources: SearchResult[]): Message[] {
    const contextBlock = sources
      .map((r) => `[${r.chunk.title}]\n${r.chunk.text}`)
      .join("\n\n");

    const messages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Include last 3 turns of history (6 messages)
    const recentHistory = this.history.slice(-6);
    messages.push(...recentHistory);

    messages.push({
      role: "user",
      content: contextBlock
        ? `Context:\n${contextBlock}\n\nQuestion: ${userQuery}`
        : `Question: ${userQuery}`,
    });

    return messages;
  }

  async ask(
    userQuery: string,
    onChunk: (text: string) => void,
    onReasoning?: (text: string) => void,
  ): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("No API key");

    // 1. Retrieve (local, ~30ms)
    const sources = await this.search(userQuery);

    // 2. Build messages
    const messages = this.buildMessages(userQuery, sources);

    // 3. Stream from Groq (~1-2s total)
    return new Promise((resolve, reject) => {
      streamGroqCompletion({
        apiKey,
        messages,
        includeReasoning: this.reasoningMode,
        onChunk,
        onReasoning,
        onDone: (fullText) => {
          // Add to history
          this.history.push(
            { role: "user", content: userQuery },
            { role: "assistant", content: fullText },
          );
          resolve(fullText);
        },
        onError: reject,
      });
    });
  }

  resetHistory() {
    this.history = [];
  }
}
```

---

## 10. Retrieval Worker

*Unchanged from v4.* Runs Orama and Transformers.js on a dedicated Web Worker thread. Handles hybrid search (BM25 + vector) and falls back to fulltext-only if the embedder fails. Full code in v4 §10.

---

## 11. Build Script

*Unchanged from v4.* Pre-computes chunk embeddings at build time using all-MiniLM-L6-v2. Outputs `knowledge-index.json` (~100–120 KB). Full code in v4 §11.

---

## 12. End-to-End Flow

```
T+0ms     User types: "How do I get financial help?"

T+1ms     Main thread → Retrieval Worker: { type: "search", query: "..." }

T+1–25ms  Retrieval Worker embeds query (all-MiniLM-L6-v2, WASM/CPU)

T+25–35ms Orama hybrid search:
          → "Bursaries" chunk (vector match: "financial help" ↔ "means-tested support")
          → "Scholarships" chunk (keyword + vector match)

T+35ms    Sources returned to main thread

T+36ms    RAGOrchestrator.buildMessages() → ~700 tokens total

T+37ms    fetch("https://api.groq.com/openai/v1/chat/completions", { stream: true })

T+150ms   First SSE chunk arrives (Groq network round-trip + prefill)

T+150–    Streaming at ~1,000 tok/s from Groq LPU
T+230ms   80 tokens generated in ~80ms

T+~250ms  COMPLETE. "Bursaries are available for 11+, 13+, and 16+ entry.
           They are means-tested and require a confidential income statement.
           A place must be offered first based on academic merit. Contact
           admissionsboys@habselstree.org.uk for details."
```

**Total response time: ~250ms.** Retrieval (~35ms) + network (~120ms) + generation (~80ms at 1,000 tok/s). This is roughly 10–20× faster than the WebLLM approach.

---

## 13. Starter Questions

- "What are the school fees for Senior School?"
- "When is the 11+ registration deadline?"
- "What GCSE grades do I need for A-Level Physics?"
- "Who is the Headmaster?"
- "What were the 2025 A-Level results?"
- "What sports are played in autumn term?"
- "What are the six Houses?"
- "How do I get financial help?"

---

## 14. Project Structure

```
beri/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css                    ← CSS variables (navy/gold/white)
│   ├── components/
│   │   ├── ChatWindow.tsx             ← Main orchestrator
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx          ← Navy bubbles, gold accents
│   │   ├── InputBar.tsx
│   │   ├── ApiKeyScreen.tsx           ← First-run API key entry
│   │   ├── WelcomeScreen.tsx          ← Starter question chips
│   │   ├── SourcePanel.tsx            ← Collapsible gold citations
│   │   └── ReasoningToggle.tsx        ← Reasoning mode toggle
│   ├── lib/
│   │   ├── groq.ts                    ← Groq API streaming client (~60 lines)
│   │   ├── api-key.ts                 ← localStorage key management
│   │   ├── rag.ts                     ← RAG orchestrator
│   │   └── types.ts
│   ├── worker/
│   │   └── retrieval-worker.ts        ← Orama + Transformers.js (CPU)
│   └── data/
│       └── knowledge-index.json       ← ~100–120 KB (text + embeddings)
├── knowledge/
│   └── habs.md                        ← Improved dataset
├── scripts/
│   └── build-index.ts                 ← Chunks + embeds at build time
├── public/
│   ├── favicon.png
│   └── beri-logo.png
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

Changes from v4:
- `groq.ts` replaces all WebLLM code (~60 lines of `fetch` + SSE parsing vs hundreds of lines of engine setup)
- `api-key.ts` added for key management
- `ApiKeyScreen.tsx` added as the first-run screen
- `llm-worker.ts` removed (no longer needed — Groq runs server-side)
- `ReasoningToggle.tsx` replaces `ThinkingToggle.tsx` (uses `include_reasoning` instead of `/think`)
- No WebLLM dependency at all

---

## 15. Next.js Config

```javascript
const nextConfig = {
  output: "export",
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,  // For Transformers.js WASM
      topLevelAwait: true,
    };
    return config;
  },
  // COOP/COEP headers no longer required (were needed for SharedArrayBuffer/WebGPU)
  // But keep them if Transformers.js benefits from multi-threaded WASM:
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      ],
    }];
  },
};
export default nextConfig;
```

---

## 16. Dependencies

```json
{
  "dependencies": {
    "@orama/orama": "^3.0.0",
    "@orama/plugin-data-persistence": "^3.0.0",
    "@huggingface/transformers": "^3.0.0",
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0",
    "tailwindcss": "^3.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.0.0"
  }
}
```

`@mlc-ai/web-llm` is **removed entirely**. No Groq SDK needed either — the API is called via native `fetch`. Two runtime dependencies beyond React/Next.js: `@orama/orama` and `@huggingface/transformers`.

---

## 17. Performance

| Metric | Value |
|--------|-------|
| Query embedding | ~20–30 ms (local, WASM/CPU) |
| Orama hybrid search | ~5–10 ms (local, JS-native) |
| Groq network round-trip | ~100–200 ms |
| Groq generation (80 tokens) | ~80 ms at ~1,000 tok/s |
| **Total response time** | **~250–350 ms** |
| Embedder download (first visit) | ~23 MB (cached after) |
| Knowledge index | ~100–120 KB (bundled) |
| LLM download | **None** (server-side) |
| Cost per query | ~$0.00013 |
| Cost per 1,000 queries | ~$0.13 |

---

## 18. Summary of Changes v4 → v5

| Aspect | v4 (WebLLM) | v5 (Groq API) |
|--------|-------------|---------------|
| LLM | Qwen3-0.6B in-browser (WebGPU) | **GPT-OSS 20B via Groq API** |
| Model quality | 0.6B parameters | **20B params (3.6B active MoE)** — dramatically smarter |
| Inference speed | 30–60 tok/s (device GPU) | **~1,000 tok/s** (Groq LPU) |
| Total response time | 2–15s depending on device | **~250–350ms** |
| First-visit download | ~375 MB (LLM + embedder) | **~23 MB** (embedder only) |
| Device requirements | WebGPU + decent GPU | **Any browser** (phone, tablet, old laptop) |
| Offline support | Yes (after download) | **No** — requires internet for LLM |
| Privacy | Fully local | Queries sent to Groq (retrieval still local) |
| Cost | Free (user's hardware) | **~$0.13 per 1,000 queries** (user's API key) |
| Authentication | None | **User provides Groq API key** |
| Dependencies | `@mlc-ai/web-llm` + Orama + Transformers.js | **Orama + Transformers.js** (no LLM package) |
| LLM code complexity | Worker + engine init + WASM + WebGPU | **~60 lines of fetch + SSE** |
| Reasoning mode | `/think`/`/nothink` prompt tokens | **`include_reasoning` API parameter** |
| Context window | 2048 tokens (hard cap) | **131K tokens** (can keep 3 turns of history) |
| Conversation history | 1 prior turn | **3 prior turns** |
| System prompt | ~75 tokens (minimal) | **~90 tokens** (richer, with fallback contact info) |
| Retrieval | Orama hybrid (**kept**) | Orama hybrid (identical) |
| Embedder | Transformers.js (**kept**) | Transformers.js (identical) |
