import { create, insert, search } from "@orama/orama";
import { persist, restore } from "@orama/plugin-data-persistence";
import { pipeline, env } from "@huggingface/transformers";

// Force single-threaded WASM — avoids onnxruntime-web trying to spawn
// em-pthread workers via new Worker(import.meta.url, ...) which breaks
// under webpack's CommonJS bundling of onnxruntime-web.
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedder: any = null;
let embedderReady = false;
let basePath = "";

const CURRENT_INDEX_VERSION = "v2";

// ── IndexedDB helpers ────────────────────────────────────────────────────────

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("beri-db", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("data");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<string | undefined> {
  const conn = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = conn.transaction("data", "readonly");
    const req = tx.objectStore("data").get(key);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: string): Promise<void> {
  const conn = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = conn.transaction("data", "readwrite");
    tx.objectStore("data").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Orama schemas ─────────────────────────────────────────────────────────────

// Text-only schema (fallback when knowledge-index.json has no embeddings)
const TEXT_SCHEMA = {
  text: "string",
  title: "string",
  section: "string",
  chunkIndex: "number",
} as const;

// Full schema with pre-computed embeddings (primary path)
const VECTOR_SCHEMA = {
  text: "string",
  title: "string",
  embedding: "vector[384]",
  section: "string",
  chunkIndex: "number",
} as const;

// ── Markdown parser / chunker (fallback only) ────────────────────────────────

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

interface TextChunk {
  text: string;
  title: string;
  section: string;
  chunkIndex: number;
}

function parseMarkdown(markdown: string): TextChunk[] {
  const sections = markdown.replace(/\r\n/g, "\n").split(/\n---\n/).filter((s) => s.trim());
  const chunks: TextChunk[] = [];
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
      // Sub-split on paragraph boundaries
      const paragraphs = text.split(/\n\n+/);
      let buffer = "";
      let subIndex = 0;

      for (const para of paragraphs) {
        const combined = buffer ? buffer + "\n\n" + para : para;
        if (buffer && combined.split(/\s+/).length * 1.3 > 300) {
          chunks.push({
            text: buffer,
            title: subIndex === 0 ? title : `${title} (cont.)`,
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
        chunks.push({
          text: buffer,
          title: subIndex === 0 ? title : `${title} (cont.)`,
          section: classifySection(title),
          chunkIndex: chunkIndex++,
        });
      }
    } else if (estimatedTokens < 30 && chunks.length > 0) {
      // Merge tiny section into previous chunk
      chunks[chunks.length - 1].text += "\n\n" + text;
    } else {
      chunks.push({
        text,
        title,
        section: classifySection(title),
        chunkIndex: chunkIndex++,
      });
    }
  }

  return chunks;
}

// ── Initialisation ────────────────────────────────────────────────────────────

async function init() {
  try {
    await _init();
  } catch (e) {
    // Last-resort safety net — orama-ready must always fire so the UI doesn't
    // hang on the loading screen regardless of what went wrong.
    console.error("Worker init failed unexpectedly:", e);
    if (!db) {
      try { db = await create({ schema: TEXT_SCHEMA }); } catch { /* ignore */ }
    }
    self.postMessage({ type: "orama-ready" });
    self.postMessage({ type: "embedder-fallback" });
  }
}

async function _init() {
  // Tracks whether we need to compute embeddings on-device (fallback path)
  let textOnlyChunks: TextChunk[] = [];
  let hasPrecomputedEmbeddings = false;

  // 1. Try warm boot from IndexedDB (contains vector-enhanced DB from a prior run)
  let warmBooted = false;
  try {
    const version = await idbGet("beri-orama-version");
    if (version === CURRENT_INDEX_VERSION) {
      const serialised = await idbGet("beri-orama");
      if (serialised) {
        db = await restore("json", serialised);
        warmBooted = true;
        hasPrecomputedEmbeddings = true;
      }
    }
  } catch {
    // Fall through to cold init
  }

  if (!warmBooted) {
    // 2. Cold init — try loading pre-built knowledge-index.json first (per spec §10).
    //    This file contains chunks with pre-computed 384-dim embeddings from the
    //    build script, so hybrid search is available as soon as the embedder loads
    //    (embedder is only needed for query-time embedding, not chunk embedding).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let indexChunks: any[] = [];

    try {
      const response = await fetch(`${basePath}/data/knowledge-index.json`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          indexChunks = data;
          // Check if the first chunk has a non-empty embedding array
          hasPrecomputedEmbeddings =
            Array.isArray(indexChunks[0]?.embedding) &&
            indexChunks[0].embedding.length === 384;
        }
      }
    } catch {
      // Fall through to .md fallback
    }

    if (indexChunks.length > 0) {
      // Primary path: use pre-built index
      const schema = hasPrecomputedEmbeddings ? VECTOR_SCHEMA : TEXT_SCHEMA;
      db = await create({ schema });
      for (const chunk of indexChunks) {
        if (hasPrecomputedEmbeddings) {
          await insert(db, chunk);
        } else {
          // Strip embedding field if schema is text-only
          const { embedding: _, ...rest } = chunk;
          await insert(db, rest);
          // Track for later on-device embedding
          textOnlyChunks.push(rest as TextChunk);
        }
      }
    } else {
      // Fallback: fetch raw markdown, chunk on device, build text-only Orama.
      // BM25 full-text search is available after this point.
      try {
        const response = await fetch(
          `${basePath}/data/Haberdashers_Boys_School_Dataset_Improved.md`,
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const markdown = await response.text();
        textOnlyChunks = parseMarkdown(markdown);
      } catch (e) {
        console.warn("Failed to load knowledge base:", e);
      }

      db = await create({ schema: TEXT_SCHEMA });
      for (const chunk of textOnlyChunks) {
        await insert(db, chunk);
      }
    }
  }

  // Signal ready — BM25 text search works from here (hybrid if pre-computed embeddings loaded)
  self.postMessage({ type: "orama-ready" });

  // 3. Load embedder in the background (~23 MB ONNX download).
  //    With pre-computed embeddings, the embedder is only needed for query-time
  //    embedding (~20–30ms per query). Without pre-computed embeddings (fallback),
  //    it also re-embeds all chunks on-device before hybrid search is available.
  try {
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

    if (!warmBooted && !hasPrecomputedEmbeddings && textOnlyChunks.length > 0) {
      // Fallback Phase 2: generate on-device embeddings, rebuild Orama with vector schema
      const vectorDb = await create({ schema: VECTOR_SCHEMA });
      for (const chunk of textOnlyChunks) {
        const output = await embedder(chunk.text, { pooling: "mean", normalize: true });
        const embedding = Array.from(output.data as Float32Array);
        await insert(vectorDb, { ...chunk, embedding });
      }
      db = vectorDb;
    }

    // Cache the DB so future visits skip cold init
    if (!warmBooted) {
      try {
        const serialised = await persist(db, "json") as string;
        await idbPut("beri-orama", serialised);
        await idbPut("beri-orama-version", CURRENT_INDEX_VERSION);
      } catch {
        // Non-fatal — next visit will rebuild again
      }
    }

    embedderReady = true;
    self.postMessage({ type: "embedder-ready" });
  } catch (e) {
    console.warn("Embedder unavailable, using fulltext-only:", e);
    self.postMessage({ type: "embedder-fallback" });
  }
}

// ── Search handler ────────────────────────────────────────────────────────────

async function handleSearch(query: string, id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let results: any;

  if (embedderReady && embedder) {
    // Hybrid search: 60% BM25 + 40% vector
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
    // Fulltext-only while embedder is still loading
    results = await search(db, {
      term: query,
      mode: "fulltext",
      limit: 2,
    });
  }

  const mapped = results.hits
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((hit: any) => ({
      chunk: {
        title: hit.document.title,
        text: hit.document.text,
        chunkIndex: hit.document.chunkIndex,
      },
      score: hit.score,
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => a.chunk.chunkIndex - b.chunk.chunkIndex);

  self.postMessage({ type: "search-results", id, results: mapped });
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
