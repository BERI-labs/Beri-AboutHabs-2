# Beri — Technical Specification v7

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
| Authentication | Owner's Groq API key, stored as a GitHub Repository Secret |

---

## 2. Brand & UI Theme

### 2.1 Colour Palette

Extracted from the Beri logo and favicon — three blueberries with gold circuit-board traces on a dark navy background, with a dark navy leaf.

```css
:root {
  --beri-navy:         #0B1A3B;    /* Primary background, dominant colour */
  --beri-navy-light:   #122552;    /* Cards, panels, elevated surfaces */
  --beri-navy-mid:     #1A3068;    /* Hover states, secondary surfaces */
  --beri-blue:         #2B4A8E;    /* Blueberry body colour, accents */
  --beri-blue-light:   #4A6DB5;    /* Links, interactive elements */
  --beri-gold:         #D4A843;    /* Circuit traces, highlights, primary accent */
  --beri-gold-light:   #E8C96A;    /* Hover gold, sparkle accents */
  --beri-white:        #F0F2F7;    /* Primary text on dark backgrounds */
  --beri-white-soft:   #B8BDD0;    /* Secondary text, muted labels */
  --beri-surface:      #0E1F45;    /* Input fields, chat bubbles (assistant) */
  --beri-user-bubble:  #1C3A6E;    /* User message bubbles */
  --beri-error:        #E85454;    /* Error states */
  --beri-success:      #4ADE80;    /* Success/ready states */
}
```

### 2.2 Design Direction

- **Dominant dark navy** — the entire app lives on `--beri-navy`. Dark-first by design, not a light app with a dark mode.
- **Gold as the accent** — sparingly used for: the Beri logo circuit traces, active states, progress bars, the reasoning-mode toggle, source citation highlights, and the blinking cursor during generation.
- **White for text** — clean, high-contrast `--beri-white` on navy. The soft off-white `#F0F2F7` reads better than pure `#FFFFFF` on dark backgrounds.
- **Typography** — a clean geometric sans-serif for body (e.g., DM Sans, Plus Jakarta Sans) paired with a slightly heavier weight for headings. Monospace for any code or data the model outputs.
- **Beri logo** — `beri-logo.png` (horizontal with text) on the loading/welcome screen. `favicon.png` (blueberry icon only) in the browser tab and as the assistant's avatar next to its messages.
- **Chat bubbles** — Assistant bubbles: `--beri-surface` with a subtle left-border in `--beri-gold`. User bubbles: `--beri-user-bubble`, right-aligned. Both with generous padding and rounded corners (12–16px).
- **No light mode.** The brand is dark navy. This is the only theme.

### 2.3 Application States

**LOADING EMBEDDER** — Brief screen (~1–3s on first visit) while Transformers.js loads the embedding model (~23 MB). Full-screen `--beri-navy` with `beri-logo.png` centred. Gold progress bar below. On return visits, loads from browser cache in <500ms.

**WELCOME** — Logo shrinks to header. Welcome message: "Hi, I'm Beri — your guide to Haberdashers' Boys' School. Ask me anything about admissions, fees, the curriculum, sport, or school life." Below: 6–8 starter question chips as gold-outlined pill buttons. Reasoning-mode toggle in settings area (gear icon or top-right).

**CHATTING** — Standard chat layout. Messages stream with a blinking gold cursor. After each Beri response, a collapsible "Sources" section shows which chunks were used (title + relevance score), styled as small gold-text pills. Input bar at bottom with send button.

**REASONING MODE ACTIVE** — Small gold badge in header: "🧠 Reasoning". Groq returns reasoning in a separate `reasoning` field — displayed in a collapsible "Reasoning" accordion above the final answer, styled in `--beri-white-soft` italic.

**ERROR: NO API KEY** — If the build-time environment variable is missing or the key is invalid, show a full-screen message: "Beri is not configured. Please contact the site administrator." This should never happen in production — it means the GitHub Secret was not set before deployment.

---

## 3. Dataset

### 3.1 Improved Knowledge Base

The improved dataset is delivered as `Haberdashers_Boys_School_Dataset_Improved.md`. Key features:

1. **Leadership section** — Headmaster Robert Sykes (since 2023), Executive Principal Gus Lock, admissions team (Avril Tooley, Binnur Rogers, Chantal Gilbert, Jennifer Adams).
2. **A-Level results from official PDFs** — complete verified data for 2025 (46.52% A*, 78.91% A*–A), 2024 (40.69% A*, 75.55% A*–A), and historical years back to 2019. Subject-level breakdown for 2025 including most popular subjects by entry.
3. **Source citation lines removed** — `**Source:** [url]` lines stripped; they add noise to retrieval.
4. **34 `##` sections with `---` separators** — each self-contained and chunking-ready.
5. **Tables preserved intact** — Fee tables, GCSE requirements, houses, schedules all kept as single units.
6. **Prose normalised** — Bullet lists converted to flowing sentences for better BM25 term coverage.
7. **Additional details** — school population (~1,450 pupils), no-phone policy (Y7–11), campus building completions (Hinton/Taylor 2022), ISI report quotes for sport.

### 3.2 Dataset Metrics

```
Words:              ~2,966
Estimated tokens:   ~3,856 (words × 1.3)
Sections (##):      34
--- separators:     35
Average section:    ~87 words (~113 tokens)
Largest section:    11+ Year 7 Entry (~250 words)
Smallest sections:  ~40 words (merged during chunking)
```

### 3.3 A-Level Results — Verified from Official PDFs

Data triple-checked against the school's own A-Level Results 2024 (updated 25/10/2024) and A-Level Results 2025 (updated 25/11/2025) PDF documents:

**2025** — 531 total entries. 247 A* (46.52%). 419 A*–A (78.91%). 496 A*–B (93.41%). 521 A*–C (98.12%).

**2024** — 548 total entries. 223 A* (40.69%). 414 A*–A (75.55%). 511 A*–B (93.25%). 534 A*–C (97.45%).

**Historical** (from the 2025 PDF's comparison table): 2023: 49.42% A*, 81.73% A*–A. 2022: 53.08% A*, 86.54% A*–A. 2021: 70.28% A*, 93.90% A*–A. 2020: 50.80% A*, 85.40% A*–A. 2019: 45.40% A*, 76.30% A*–A.

Note: The 2025 PDF lists 2024 A* as 40.77% while the 2024 PDF shows 40.69%. This minor discrepancy likely reflects updated/remark data. The dataset uses the figures as stated in each year's own PDF.

---

## 4. Retrieval: Hybrid Search with Orama

### 4.1 Why Hybrid

**BM25 still handles the majority case.** Most parent queries are keyword-heavy: "Year 7 fees", "11+ deadline 2026", "Headmaster". BM25 matches these directly and precisely. This is why the hybrid weight favours text (60%) over vector (40%).

**Vectors catch what keywords miss.** A parent asking "How do I get financial help?" won't match the word "bursary" via BM25. A parent asking "What support is there for my child's wellbeing?" won't match "pastoral care" or "House system". Vector search maps intent to meaning, rescuing these queries.

**Orama replaces custom code with a better library.** Orama is <2 KB, JS-native, includes stemming and typo tolerance out of the box, has a built-in hybrid mode with configurable weights, and ships with an IndexedDB persistence plugin.

### 4.2 Hybrid Weight Rationale: α = 0.4

Orama's hybrid mode computes: `H = (1 − α)K + αV` where K is the BM25 score and V is the vector similarity score.

| Query type | Example | Winner | Frequency |
|------------|---------|--------|-----------|
| Exact keyword lookup | "Year 7 fees", "11+ deadline" | BM25 | ~50% |
| Named entity | "Who is the Headmaster?", "What are the Houses?" | BM25 | ~20% |
| Numeric/tabular | "GCSE grade for Physics A-Level" | BM25 | ~10% |
| Semantic intent | "How do I get financial help?" | Vector | ~10% |
| Conceptual | "What's the school's approach to wellbeing?" | Vector | ~10% |

~80% of queries are keyword-dominant. α = 0.4 (40% vector, 60% text) preserves keyword precision for the majority while still catching the ~20% of semantic queries that BM25 would miss. This is a starting default and should be tuned after testing with real parent queries.

### 4.3 Orama Schema and Initialisation

```typescript
import { create, insert, search } from "@orama/orama";
import { persist, restore } from "@orama/plugin-data-persistence";

const ORAMA_SCHEMA = {
  text: "string",                 // Full chunk text → BM25 indexing
  title: "string",                // Section heading → BM25 + display
  embedding: "vector[384]",       // Pre-computed all-MiniLM-L6-v2 (384-dim)
  section: "string",              // Metadata tag (e.g., "Admissions", "Fees")
  chunkIndex: "number",           // Stable sort key for prompt ordering
} as const;

export async function initOrama() {
  // Try warm boot from IndexedDB first
  try {
    const persisted = await loadFromIndexedDB("beri-orama-index");
    if (persisted) {
      const db = await restore("json", persisted);
      return db;
    }
  } catch {
    // Fall through to cold init
  }

  // Cold init: create from bundled data
  const db = await create({ schema: ORAMA_SCHEMA });
  const chunks = await loadBundledChunks(); // from knowledge-index.json
  for (const chunk of chunks) {
    await insert(db, chunk);
  }

  // Persist for next warm boot
  const serialized = await persist(db, "json");
  await saveToIndexedDB("beri-orama-index", serialized);

  return db;
}
```

### 4.4 Hybrid Search Execution

```typescript
import { search } from "@orama/orama";

export async function hybridSearch(
  db: OramaDB,
  queryText: string,
  queryEmbedding: Float32Array,
  limit: number = 2,
): Promise<SearchResult[]> {
  const results = await search(db, {
    term: queryText,
    mode: "hybrid",
    vector: {
      value: Array.from(queryEmbedding),
      property: "embedding",
    },
    hybridWeights: {
      text: 0.6,   // BM25 / lexical
      vector: 0.4, // Semantic / vector
    },
    limit,
    similarity: 0.5, // Minimum cosine similarity threshold
  });

  // Sort by chunkIndex for stable prompt ordering
  return results.hits
    .map((hit) => ({
      chunk: hit.document,
      score: hit.score,
    }))
    .sort((a, b) => a.chunk.chunkIndex - b.chunk.chunkIndex);
}
```

### 4.5 Fulltext-Only Fallback

If the embedding model fails to load (out of memory, unsupported browser, download error), Orama gracefully degrades to BM25-only search:

```typescript
export async function fulltextFallback(
  db: OramaDB,
  queryText: string,
  limit: number = 2,
): Promise<SearchResult[]> {
  const results = await search(db, {
    term: queryText,
    mode: "fulltext",
    limit,
  });

  return results.hits
    .map((hit) => ({
      chunk: hit.document,
      score: hit.score,
    }))
    .sort((a, b) => a.chunk.chunkIndex - b.chunk.chunkIndex);
}
```

Beri always works. Hybrid search when available, BM25 when not. The user never sees an error — they just get slightly less sophisticated retrieval.

### 4.6 Chunking

Split on `---` horizontal rules (35 separators → ~34 segments). Merge segments under 30 tokens into the previous. Sub-split segments over 350 tokens on paragraph boundaries. Expected output: **~30–34 chunks**, mostly 50–250 tokens. Tables preserved intact.

### 4.7 Stable Prompt Ordering

Sorting retrieved chunks by `chunkIndex` (their position in the dataset) rather than by score ensures that the same two chunks always appear in the same order in the prompt, regardless of which scored higher.

Prompt structure (most-stable first, most-dynamic last):

```
[System Prompt — always identical]
[Conversation History — dynamic]
[RAG Context — sorted by chunkIndex, semi-stable]
[User Question — dynamic]
```

---

## 5. Embedding: Transformers.js + all-MiniLM-L6-v2

### 5.1 Model Choice

| Property | Value |
|----------|-------|
| Dimensions | 384 |
| ONNX file size (quantized) | ~23 MB |
| Per-query latency (WASM/CPU) | ~20–30 ms |
| Pooling | Mean |
| Normalisation | L2 |
| Runtime | Transformers.js v3+ (ONNX Runtime WASM) |

It runs entirely on CPU via WebAssembly. There is no GPU contention — the LLM runs server-side on Groq's hardware.

### 5.2 Pre-Computed Chunk Embeddings

Chunk embeddings are generated at build time, not at runtime. The build script (§11) processes each chunk through all-MiniLM-L6-v2 and stores the resulting 384-dimensional vector in the Orama index alongside the text.

```
34 chunks × 384 floats × 4 bytes = ~52 KB
```

This 52 KB is included in the bundled `knowledge-index.json`. At runtime, only the user's query needs to be embedded (~20–30 ms). The chunks are never re-embedded.

### 5.3 Embedder Initialisation (Retrieval Worker)

```typescript
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

let embedder: FeatureExtractionPipeline | null = null;
let embedderReady = false;

async function initEmbedder(onProgress?: (p: number) => void): Promise<void> {
  try {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      dtype: "q8",                   // Quantized for smaller download
      device: "wasm",                // Force CPU
      progress_callback: (data: any) => {
        if (data.status === "progress" && onProgress) {
          onProgress(data.progress);
        }
      },
    });
    embedderReady = true;
  } catch (e) {
    console.warn("Embedder failed to load, falling back to fulltext-only:", e);
    embedderReady = false;
  }
}

async function embedQuery(text: string): Promise<Float32Array | null> {
  if (!embedder) return null;
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return new Float32Array(output.data);
}
```

### 5.4 Loading Strategy

On app start, the retrieval worker loads the embedding model while the main thread renders the welcome screen. If the embedder is still loading when the user sends their first query, the retrieval worker falls back to fulltext-only mode for that query and switches to hybrid mode once the embedder is ready.

```
T+0ms     App starts
          └─ Retrieval Worker: Transformers.js loads MiniLM from cache/network (~23 MB)
                               Orama restores index from IndexedDB (<200ms)

T+1-3s    Worker ready (warm boot <500ms)
          App transitions from LOADING → WELCOME
```

---

## 6. Context Window & Prompt Budget

GPT-OSS 20B supports 131K context. However, Beri should still keep prompts lean — shorter prompts mean faster prefill on Groq and lower cost.

| Component | Tokens | Notes |
|-----------|--------|-------|
| System prompt | ~90 | See §7 |
| Retrieved chunks (top 2) | ~200–300 | 2 chunks, avg ~113 tokens each |
| User question | ~30–50 | |
| Conversation history (last 3 turns) | ~300–600 | Can afford more history with 131K window |
| **Total input** | **~620–1,040** | |
| max_completion_tokens | 512 | Safety cap; most answers stop at 60–150 tokens |

With 131K context available, we keep 3 prior turns of conversation history. This gives good conversational continuity for follow-up questions. Top-K = 2 for retrieval: one primary match, one fallback.

---

## 7. System Prompt

```
You are Beri, the AI assistant for Haberdashers' Boys' School (Habs Boys) in Elstree, Hertfordshire. Answer questions using ONLY the provided context. Quote exact figures for dates, fees, percentages, and grades. If the context doesn't contain the answer, say "I don't have that information — please contact the school directly at 020 8266 1700 or admissionsboys@habselstree.org.uk." Keep answers to 1–3 sentences unless the question requires more detail.
```

~90 tokens. The fallback message includes the school's actual contact details. Reasoning mode is controlled via the `include_reasoning` parameter on the API call, not via prompt tokens.

---

## 8. LLM: Groq API with GPT-OSS 20B

### 8.1 Why Groq + GPT-OSS 20B

**Groq's LPU hardware** delivers ~1,000 tokens/second for GPT-OSS 20B. An 80-token answer generates in ~80ms. With network round-trip, the user sees a complete response in under 2 seconds.

**GPT-OSS 20B** is an OpenAI open-weight MoE model with 20B total parameters (3.6B active per forward pass). Key specs:

- 131K context window
- MoE architecture (32 experts, top-4 routing)
- Reasoning mode with variable effort (low/medium/high)
- OpenAI-compatible chat completions API
- $0.10 per million input tokens, $0.50 per million output tokens

**Cost estimate for Beri:** A typical query uses ~800 input tokens and ~100 output tokens. That's $0.00013 per query. At 1,000 queries/month (heavy school usage), the total cost is ~$0.13/month. Effectively free.

### 8.2 API Integration

Groq's API is OpenAI-compatible. The integration is a single `fetch` call with streaming:

```typescript
// lib/groq.ts
import { getApiKey } from "./api-key";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface GroqStreamOptions {
  messages: Array<{ role: string; content: string }>;
  includeReasoning?: boolean;
  onChunk: (text: string) => void;
  onReasoning?: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function streamGroqCompletion({
  messages,
  includeReasoning = false,
  onChunk,
  onReasoning,
  onDone,
  onError,
}: GroqStreamOptions): Promise<void> {
  try {
    const apiKey = getApiKey(); // Build-time env var, see §8.3

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

This is the entire LLM integration. No workers, no WASM, no WebGPU, no model downloads. A single `fetch` with SSE streaming.

### 8.3 API Key Management (GitHub Repository Secret)

The Groq API key is the **owner's key**, embedded at build time — users never see or provide a key. Follow GitHub's guidance on [keeping API credentials secure](https://docs.github.com/en/rest/authentication/keeping-your-api-credentials-secure?apiVersion=2022-11-28): never commit secrets as plain text; use GitHub Repository Secrets and inject them via environment variables at build time.

**Setup (one-time, done by the repository owner):**

1. Go to the GitHub repo → Settings → Secrets and variables → Actions.
2. Click "New repository secret".
3. Name: `GROQ_API_KEY`. Value: your Groq API key (from `console.groq.com/keys`).
4. Save. This secret is encrypted at rest by GitHub and is only exposed to GitHub Actions workflows as an environment variable during build.

**Local development:** Create a `.env.local` file (already gitignored by Next.js) with:

```env
# .env.local — NEVER commit this file
NEXT_PUBLIC_GROQ_API_KEY=gsk_your_key_here
```

**GitHub Actions build:** The CI/CD workflow injects the secret as a build-time environment variable:

```yaml
# .github/workflows/deploy.yml
name: Deploy Beri
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm run build:index   # Build the Orama knowledge index
      - run: npm run build          # Next.js static export
        env:
          NEXT_PUBLIC_GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}

      # Deploy the `out/` directory to your hosting (Vercel, GitHub Pages, etc.)
      - uses: actions/upload-pages-artifact@v3
        with:
          path: out
```

**How it works:** Next.js replaces `process.env.NEXT_PUBLIC_GROQ_API_KEY` with the literal string value at build time in the client bundle. The `NEXT_PUBLIC_` prefix is required for Next.js to expose it to the browser. The key ends up in the compiled JS — this is intentional and acceptable because:

- Groq API keys can be scoped and rate-limited.
- The key is your own, for your own school project.
- The alternative (a proxy server) adds cost, latency, and complexity for no real benefit here.
- You can rotate the key at any time via the Groq console and redeploy.

**Access in code:**

```typescript
// lib/api-key.ts

export function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_GROQ_API_KEY is not set. " +
      "Add it as a GitHub Repository Secret (for CI) or in .env.local (for local dev)."
    );
  }
  return key;
}
```

**Security checklist for Claude Code:**
- [ ] `.env.local` is listed in `.gitignore` (Next.js does this by default).
- [ ] The Groq API key is **never** hardcoded in any source file.
- [ ] The key is only accessed via `process.env.NEXT_PUBLIC_GROQ_API_KEY`.
- [ ] The GitHub Actions workflow references `${{ secrets.GROQ_API_KEY }}`, never the raw key.
- [ ] The `README.md` documents that the repo owner must add the `GROQ_API_KEY` secret before deploying.

### 8.4 Reasoning Mode

GPT-OSS 20B supports variable reasoning via the `include_reasoning` and `reasoning_effort` parameters.

- **Default (reasoning off):** `include_reasoning: false`. The model answers directly. Fast.
- **Reasoning on:** `include_reasoning: true`, `reasoning_effort: "low"`. The model reasons step-by-step. Reasoning content is returned in a separate `reasoning` field in the response, not in the main `content`. The UI shows it in a collapsible "Reasoning" accordion above the answer.

The `"low"` reasoning effort is appropriate for school Q&A. If testing shows benefit, this can be bumped to `"medium"`.

### 8.5 Error Handling

```typescript
// Common Groq API errors and how Beri handles them:

// 401 Unauthorized — API key is invalid or expired
// → Show: "Beri's API key is invalid. Please contact the site administrator."
// → Fix: Rotate the key in Groq console, update the GitHub Secret, and redeploy.

// 429 Rate Limited — too many requests
// → Show: "Beri is being used too quickly. Please wait a moment."
// → Groq free tier: 30 requests/minute, 14,400/day (generous for school use)

// 503 Service Unavailable — Groq is down
// → Show: "The AI service is temporarily unavailable. Please try again."

// Network error — user is offline
// → Show: "Beri needs an internet connection for AI responses."

// Missing env var — NEXT_PUBLIC_GROQ_API_KEY not set at build time
// → Show: "Beri is not configured. Please contact the site administrator."
// → This means the GitHub Secret was not set before deployment.
```

---

## 9. RAG Orchestrator

The orchestrator coordinates between the local retrieval worker and the Groq API.

```typescript
// lib/rag.ts
import { streamGroqCompletion } from "./groq";

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
    // 1. Retrieve (local, ~30ms)
    const sources = await this.search(userQuery);

    // 2. Build messages
    const messages = this.buildMessages(userQuery, sources);

    // 3. Stream from Groq
    return new Promise((resolve, reject) => {
      streamGroqCompletion({
        messages,
        includeReasoning: this.reasoningMode,
        onChunk,
        onReasoning,
        onDone: (fullText) => {
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

The retrieval worker runs Orama and Transformers.js on a dedicated Web Worker thread, keeping the main thread free for UI rendering.

```typescript
// worker/retrieval-worker.ts
import { create, insert, search } from "@orama/orama";
import { persist, restore } from "@orama/plugin-data-persistence";
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

let db: any = null;
let embedder: FeatureExtractionPipeline | null = null;
let embedderReady = false;

const CURRENT_INDEX_VERSION = "v1"; // Bump when dataset changes

// --- Initialisation ---

async function init() {
  // 1. Load Orama index (fast — bundled JSON or IndexedDB)
  try {
    const cached = localStorage.getItem("beri-orama-version");
    if (cached === CURRENT_INDEX_VERSION) {
      db = await restore("json", await loadFromIndexedDB("beri-orama"));
    }
  } catch { /* fall through */ }

  if (!db) {
    db = await create({
      schema: {
        text: "string",
        title: "string",
        embedding: "vector[384]",
        section: "string",
        chunkIndex: "number",
      },
    });
    const chunks = await (await fetch("/data/knowledge-index.json")).json();
    for (const chunk of chunks) {
      await insert(db, chunk);
    }
    const serialized = await persist(db, "json");
    await saveToIndexedDB("beri-orama", serialized);
    localStorage.setItem("beri-orama-version", CURRENT_INDEX_VERSION);
  }

  self.postMessage({ type: "orama-ready" });

  // 2. Load embedder (slower — ~23 MB ONNX model)
  try {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      dtype: "q8",
      device: "wasm",
      progress_callback: (data: any) => {
        if (data.status === "progress") {
          self.postMessage({ type: "embedder-progress", progress: data.progress });
        }
      },
    });
    embedderReady = true;
    self.postMessage({ type: "embedder-ready" });
  } catch (e) {
    console.warn("Embedder unavailable, using fulltext-only:", e);
    self.postMessage({ type: "embedder-fallback" });
  }
}

// --- Search handler ---

async function handleSearch(query: string, id: string) {
  let results;

  if (embedderReady && embedder) {
    // Hybrid search
    const output = await embedder(query, { pooling: "mean", normalize: true });
    const queryVector = Array.from(output.data as Float32Array);

    results = await search(db, {
      term: query,
      mode: "hybrid",
      vector: {
        value: queryVector,
        property: "embedding",
      },
      hybridWeights: { text: 0.6, vector: 0.4 },
      limit: 2,
      similarity: 0.5,
    });
  } else {
    // Fulltext-only fallback
    results = await search(db, {
      term: query,
      mode: "fulltext",
      limit: 2,
    });
  }

  const mapped = results.hits
    .map((hit: any) => ({
      chunk: {
        title: hit.document.title,
        text: hit.document.text,
        chunkIndex: hit.document.chunkIndex,
      },
      score: hit.score,
    }))
    .sort((a: any, b: any) => a.chunk.chunkIndex - b.chunk.chunkIndex);

  self.postMessage({ type: "search-results", id, results: mapped });
}

// --- Message router ---

self.onmessage = (e: MessageEvent) => {
  const { type, query, id } = e.data;
  if (type === "init") init();
  if (type === "search") handleSearch(query, id);
};
```

### 10.1 Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│                    MAIN THREAD                       │
│  React UI (ChatWindow, MessageBubble, etc.)         │
│  RAGOrchestrator (coordinates worker + Groq API)    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────┐                        │
│  │  Web Worker: Retrieval    │  ← CPU only           │
│  │  ──────────────────────   │                        │
│  │  Orama (BM25 + hybrid)   │                        │
│  │  Transformers.js embedder │                        │
│  │  (~23 MB ONNX model)     │                        │
│  └──────────────────────────┘                        │
│                                                      │
│              ↕ fetch (HTTPS)                         │
│                                                      │
│  ┌──────────────────────────┐                        │
│  │  Groq API (remote)        │  ← Groq LPU hardware  │
│  │  openai/gpt-oss-20b      │                        │
│  │  ~1,000 tok/s streaming   │                        │
│  └──────────────────────────┘                        │
└─────────────────────────────────────────────────────┘
```

The retrieval worker handles all embedding and search locally. The Groq API call is a simple `fetch` from the main thread — no worker needed for a network request.

---

## 11. Build Script

Pre-computes chunk embeddings at build time using all-MiniLM-L6-v2.

```typescript
// scripts/build-index.ts
import { pipeline } from "@huggingface/transformers";
import { readFileSync, writeFileSync } from "fs";

async function buildIndex() {
  // 1. Load embedder
  const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    dtype: "q8",
  });

  // 2. Parse dataset
  const raw = readFileSync("knowledge/habs.md", "utf-8");
  const sections = raw.split(/\n---\n/).filter((s) => s.trim());

  const chunks: any[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const titleMatch = section.match(/^## (.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Chunk ${chunkIndex}`;
    const text = section
      .replace(/^## .+$/m, "")
      .replace(/\*\*Source:\*\*.+$/gm, "")
      .trim();

    if (!text || text.length < 20) continue;

    // Estimate tokens (~1.3 tokens per word)
    const wordCount = text.split(/\s+/).length;
    const estimatedTokens = Math.round(wordCount * 1.3);

    if (estimatedTokens > 350) {
      // Sub-split on paragraph boundaries
      const paragraphs = text.split(/\n\n+/);
      let buffer = "";
      let subIndex = 0;

      for (const para of paragraphs) {
        if (buffer && (buffer + "\n\n" + para).split(/\s+/).length * 1.3 > 300) {
          const embedding = await embedder(buffer, { pooling: "mean", normalize: true });
          chunks.push({
            text: buffer,
            title: subIndex === 0 ? title : `${title} (cont.)`,
            embedding: Array.from(embedding.data as Float32Array),
            section: classifySection(title),
            chunkIndex: chunkIndex++,
          });
          buffer = para;
          subIndex++;
        } else {
          buffer = buffer ? buffer + "\n\n" + para : para;
        }
      }
      if (buffer) {
        const embedding = await embedder(buffer, { pooling: "mean", normalize: true });
        chunks.push({
          text: buffer,
          title: subIndex === 0 ? title : `${title} (cont.)`,
          embedding: Array.from(embedding.data as Float32Array),
          section: classifySection(title),
          chunkIndex: chunkIndex++,
        });
      }
    } else if (estimatedTokens < 30 && chunks.length > 0) {
      // Merge into previous chunk
      const prev = chunks[chunks.length - 1];
      prev.text += "\n\n" + text;
      const embedding = await embedder(prev.text, { pooling: "mean", normalize: true });
      prev.embedding = Array.from(embedding.data as Float32Array);
    } else {
      // Normal chunk
      const embedding = await embedder(text, { pooling: "mean", normalize: true });
      chunks.push({
        text,
        title,
        embedding: Array.from(embedding.data as Float32Array),
        section: classifySection(title),
        chunkIndex: chunkIndex++,
      });
    }
  }

  writeFileSync(
    "app/data/knowledge-index.json",
    JSON.stringify(chunks, null, 0), // Minified
  );

  console.log(`Built ${chunks.length} chunks with embeddings`);
  console.log(`Output: ${(JSON.stringify(chunks).length / 1024).toFixed(1)} KB`);
}

function classifySection(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("fee") || t.includes("payment") || t.includes("vat") || t.includes("bursary") || t.includes("scholarship")) return "Financial";
  if (t.includes("admissions") || t.includes("entry") || t.includes("occasional") || t.includes("faq")) return "Admissions";
  if (t.includes("a-level") || t.includes("gcse") || t.includes("sixth form") || t.includes("diploma") || t.includes("senior") || t.includes("prep")) return "Academic";
  if (t.includes("sport") || t.includes("performance") || t.includes("house")) return "Co-Curricular";
  if (t.includes("history") || t.includes("leader") || t.includes("vision") || t.includes("strategic") || t.includes("overview")) return "About";
  return "General";
}

buildIndex();
```

Output: `knowledge-index.json` containing ~30–34 chunks, each with text, title, 384-dim embedding, section tag, and chunkIndex. Estimated file size: ~100–120 KB.

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

**Total response time: ~250ms.** Retrieval (~35ms) + network (~120ms) + generation (~80ms at 1,000 tok/s).

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
├── .github/
│   └── workflows/
│       └── deploy.yml                 ← Injects GROQ_API_KEY secret at build
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css                    ← CSS variables (navy/gold/white)
│   ├── components/
│   │   ├── ChatWindow.tsx             ← Main orchestrator
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx          ← Navy bubbles, gold accents
│   │   ├── InputBar.tsx
│   │   ├── WelcomeScreen.tsx          ← Starter question chips
│   │   ├── SourcePanel.tsx            ← Collapsible gold citations
│   │   └── ReasoningToggle.tsx        ← Reasoning mode toggle
│   ├── lib/
│   │   ├── groq.ts                    ← Groq API streaming client (~60 lines)
│   │   ├── api-key.ts                 ← Reads NEXT_PUBLIC_GROQ_API_KEY env var
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
├── .env.local                         ← Local dev only, gitignored (NEXT_PUBLIC_GROQ_API_KEY=...)
├── .gitignore                         ← Must include .env.local
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

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

No Groq SDK needed — the API is called via native `fetch`. No WebLLM dependency. Two runtime dependencies beyond React/Next.js: `@orama/orama` and `@huggingface/transformers`.

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
