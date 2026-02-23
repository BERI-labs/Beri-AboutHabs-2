// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedder: any = null;
let embedderReady = false;
let basePath = "";

interface Chunk {
  text: string;
  title: string;
  embedding: number[];
  section: string;
  chunkIndex: number;
}

let chunks: Chunk[] = [];

// ── Cosine similarity ────────────────────────────────────────────────────────

function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Keyword fallback (used before embedder loads) ────────────────────────────

function keywordSearch(query: string, topK: number) {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const scored = chunks.map((chunk) => {
    const haystack = (chunk.title + " " + chunk.text).toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (haystack.includes(term)) score++;
    }
    return { chunk, score };
  });
  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ── Markdown parser / chunker (fallback when knowledge-index.json unavailable)

function classifySection(title: string): string {
  const t = title.toLowerCase();
  if (
    t.includes("fee") || t.includes("payment") || t.includes("vat") ||
    t.includes("bursar") || t.includes("scholarship")
  ) return "Financial";
  if (
    t.includes("admissions") || t.includes("entry") || t.includes("occasional") ||
    t.includes("faq") || t.includes("reception") || t.includes("year 3") ||
    t.includes("year 7") || t.includes("year 9") || t.includes("sixth form entry")
  ) return "Admissions";
  if (
    t.includes("a-level") || t.includes("gcse") || t.includes("sixth form") ||
    t.includes("diploma") || t.includes("senior school") || t.includes("prep school") ||
    t.includes("prep co")
  ) return "Academic";
  if (
    t.includes("sport") || t.includes("performance") || t.includes("house") ||
    t.includes("facilities")
  ) return "Co-Curricular";
  if (
    t.includes("history") || t.includes("leader") || t.includes("vision") ||
    t.includes("strategic") || t.includes("overview") || t.includes("structure") ||
    t.includes("contact") || t.includes("affiliations")
  ) return "About";
  return "General";
}

function parseMarkdown(markdown: string): Chunk[] {
  const sections = markdown.replace(/\r\n/g, "\n").split(/\n---\n/).filter((s) => s.trim());
  const result: Chunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const titleMatch = section.match(/^## (.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Chunk ${chunkIndex}`;
    const text = section
      .replace(/^## .+$/m, "")
      .replace(/\*\*Source:\*\*.+$/gm, "")
      .replace(/^#.+$/m, "")
      .trim();

    if (!text || text.length < 20) continue;

    const wordCount = text.split(/\s+/).length;
    const estimatedTokens = Math.round(wordCount * 1.3);

    if (estimatedTokens > 350) {
      const paragraphs = text.split(/\n\n+/);
      let buffer = "";
      let subIndex = 0;

      for (const para of paragraphs) {
        const combined = buffer ? buffer + "\n\n" + para : para;
        if (buffer && combined.split(/\s+/).length * 1.3 > 300) {
          result.push({
            text: buffer,
            title: subIndex === 0 ? title : `${title} (cont.)`,
            embedding: [],
            section: classifySection(title),
            chunkIndex: chunkIndex++,
          });
          buffer = para;
          subIndex++;
        } else {
          buffer = combined;
        }
      }
      if (buffer) {
        result.push({
          text: buffer,
          title: subIndex === 0 ? title : `${title} (cont.)`,
          embedding: [],
          section: classifySection(title),
          chunkIndex: chunkIndex++,
        });
      }
    } else if (estimatedTokens < 30 && result.length > 0) {
      result[result.length - 1].text += "\n\n" + text;
    } else {
      result.push({
        text,
        title,
        embedding: [],
        section: classifySection(title),
        chunkIndex: chunkIndex++,
      });
    }
  }

  return result;
}

// ── Initialisation ────────────────────────────────────────────────────────────

async function init() {
  try {
    await _init();
  } catch (e) {
    console.error("Worker init failed unexpectedly:", e);
    self.postMessage({ type: "orama-ready" });
    self.postMessage({ type: "embedder-fallback" });
  }
}

async function _init() {
  // 1. Load pre-built knowledge-index.json (primary path)
  try {
    const response = await fetch(`${basePath}/data/knowledge-index.json`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        chunks = data;
      }
    }
  } catch {
    // Fall through to .md fallback
  }

  // 2. Fallback: fetch raw markdown and chunk on device (no embeddings)
  if (chunks.length === 0) {
    try {
      const response = await fetch(
        `${basePath}/data/Haberdashers_Boys_School_Dataset_Improved.md`,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const markdown = await response.text();
      chunks = parseMarkdown(markdown);
    } catch (e) {
      console.warn("Failed to load knowledge base:", e);
    }
  }

  // Signal ready — keyword search works from here, vector search once embedder loads
  self.postMessage({ type: "orama-ready" });

  // 3. Lazy-load the embedder (~23 MB ONNX download).
  //    Dynamic import() avoids crashing the worker at module load time if
  //    @huggingface/transformers has internal init errors (e.g. tokenizer
  //    constructors calling .replace() on non-string config values).
  try {
    const { pipeline, env } = await import("@huggingface/transformers");

    // Force single-threaded WASM — avoids onnxruntime-web trying to spawn
    // em-pthread workers which breaks under webpack's bundling.
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.numThreads = 1;
    }

    embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      {
        dtype: "q8",
        device: "wasm",
        progress_callback: (data: { status: string; progress?: number }) => {
          if (data.status === "progress") {
            self.postMessage({ type: "embedder-progress", progress: data.progress ?? 0 });
          }
        },
      },
    );

    // If chunks came from .md fallback (no embeddings), compute them now
    const needsEmbedding = chunks.length > 0 && chunks[0].embedding.length === 0;
    if (needsEmbedding) {
      for (const chunk of chunks) {
        const output = await embedder(chunk.text, { pooling: "mean", normalize: true });
        chunk.embedding = Array.from(output.data as Float32Array);
      }
    }

    embedderReady = true;
    self.postMessage({ type: "embedder-ready" });
  } catch (e) {
    console.warn("Embedder unavailable, using keyword-only search:", e);
    self.postMessage({ type: "embedder-fallback" });
  }
}

// ── Search handler ────────────────────────────────────────────────────────────

async function handleSearch(query: string, id: string) {
  const topK = 2;

  if (embedderReady && embedder && chunks.length > 0 && chunks[0].embedding.length > 0) {
    // Vector search: embed query, cosine similarity against all chunks
    const output = await embedder(query, { pooling: "mean", normalize: true });
    const queryVec = Array.from(output.data as Float32Array) as number[];

    const scored = chunks
      .map((chunk) => ({ chunk, score: cosineSim(queryVec, chunk.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    const mapped = scored
      .map((r) => ({
        chunk: { title: r.chunk.title, text: r.chunk.text, chunkIndex: r.chunk.chunkIndex },
        score: r.score,
      }))
      .sort((a, b) => a.chunk.chunkIndex - b.chunk.chunkIndex);

    self.postMessage({ type: "search-results", id, results: mapped });
  } else {
    // Keyword fallback while embedder is loading
    const results = keywordSearch(query, topK)
      .map((r) => ({
        chunk: { title: r.chunk.title, text: r.chunk.text, chunkIndex: r.chunk.chunkIndex },
        score: r.score,
      }))
      .sort((a, b) => a.chunk.chunkIndex - b.chunk.chunkIndex);

    self.postMessage({ type: "search-results", id, results });
  }
}

// ── Message router ────────────────────────────────────────────────────────────

self.onmessage = (e: MessageEvent<{ type: string; query?: string; id?: string; basePath?: string }>) => {
  const { type, query, id } = e.data;
  if (type === "init") {
    basePath = e.data.basePath ?? "";
    init();
  }
  if (type === "search" && query && id) handleSearch(query, id);
};
