import { create, insert, search } from "@orama/orama";
import { persist, restore } from "@orama/plugin-data-persistence";
import { pipeline } from "@huggingface/transformers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedder: any = null;
let embedderReady = false;
let basePath = "";

const CURRENT_INDEX_VERSION = "v1";

// ── IndexedDB helpers ────────────────────────────────────────────────────────

function saveToIDB(key: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("beri-db", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("data");
    req.onsuccess = () => {
      const tx = req.result.transaction("data", "readwrite");
      tx.objectStore("data").put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
}

function loadFromIDB(key: string): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("beri-db", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("data");
    req.onsuccess = () => {
      const tx = req.result.transaction("data", "readonly");
      const getReq = tx.objectStore("data").get(key);
      getReq.onsuccess = () => resolve(getReq.result as string | undefined);
      getReq.onerror = () => reject(getReq.error);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Orama schema ─────────────────────────────────────────────────────────────

const SCHEMA = {
  text: "string",
  title: "string",
  embedding: "vector[384]",
  section: "string",
  chunkIndex: "number",
} as const;

// ── Initialisation ────────────────────────────────────────────────────────────

async function init() {
  // 1. Load Orama — try warm boot from IndexedDB first
  let loaded = false;

  try {
    const version = (self as unknown as { localStorage?: Storage }).localStorage?.getItem(
      "beri-orama-version",
    );
    if (version === CURRENT_INDEX_VERSION) {
      const serialised = await loadFromIDB("beri-orama");
      if (serialised) {
        db = await restore("json", serialised);
        loaded = true;
      }
    }
  } catch {
    // Fall through to cold init
  }

  if (!loaded) {
    db = await create({ schema: SCHEMA });
    const response = await fetch(`${basePath}/data/knowledge-index.json`);
    const chunks = await response.json();
    for (const chunk of chunks) {
      await insert(db, chunk);
    }

    try {
      const serialised = await persist(db, "json") as string;
      await saveToIDB("beri-orama", serialised);
      (self as unknown as { localStorage?: Storage }).localStorage?.setItem(
        "beri-orama-version",
        CURRENT_INDEX_VERSION,
      );
    } catch {
      // Persistence failure is non-fatal; next load will cold-init again
    }
  }

  self.postMessage({ type: "orama-ready" });

  // 2. Load embedder (background, ~23 MB)
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
