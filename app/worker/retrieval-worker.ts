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
  url?: string;
}

let chunks: Chunk[] = [];

// ── BM25 index (built once after chunks load) ───────────────────────────────

const BM25_K1 = 1.2;
const BM25_B = 0.75;

let docFreqs: Map<string, number> = new Map(); // term → number of docs containing it
let docTermFreqs: { terms: Map<string, number>; length: number }[] = []; // per-chunk
let avgDocLength = 0;

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9']+/g, " ").split(/\s+/).filter((t) => t.length > 1);
}

// ── Synonym expansion ─────────────────────────────────────────────────────────

const SYNONYM_MAP: Record<string, string[]> = {
  cost:      ["fees", "tuition", "price", "pricing"],
  costs:     ["fees", "tuition", "price", "pricing"],
  price:     ["fees", "tuition", "cost"],
  prices:    ["fees", "tuition", "cost"],
  pricing:   ["fees", "tuition", "cost"],
  afford:    ["bursary", "bursaries", "financial", "assistance"],
  affordable:["bursary", "fee", "assistance"],
  cheap:     ["bursary", "fee", "assistance", "affordable"],
  money:     ["fees", "financial", "bursary", "bursaries", "cost"],
  pay:       ["fees", "payment", "tuition"],
  paying:    ["fees", "payment", "tuition"],
  payment:   ["fees", "tuition", "cost"],
  financial: ["bursary", "bursaries", "fees", "assistance", "funding"],
  funding:   ["bursary", "bursaries", "financial", "assistance"],
  bursary:   ["financial", "means-tested", "assistance"],
  bursaries: ["financial", "means-tested", "assistance"],
  scholarship:["award", "merit"],
  scholarships:["award", "merit"],
  apply:     ["application", "admissions", "register", "entry"],
  applying:  ["application", "admissions", "register", "entry"],
  joining:   ["admissions", "entry", "application", "enrol"],
  enrol:     ["admissions", "entry", "application", "joining"],
  enroll:    ["admissions", "entry", "application", "joining"],
  subjects:  ["curriculum", "courses", "options", "gcse", "a-level"],
  subject:   ["curriculum", "courses", "options", "gcse", "a-level"],
  sport:     ["sports", "co-curricular", "activities", "facilities"],
  sports:    ["sport", "co-curricular", "activities", "facilities"],
  uniform:   ["dress", "clothing", "kit"],
  teacher:   ["staff", "faculty", "master"],
  teachers:  ["staff", "faculty", "masters"],
  grades:    ["results", "gcse", "a-level", "performance", "attainment"],
  grade:     ["results", "gcse", "a-level", "performance"],
  results:   ["grades", "gcse", "a-level", "performance", "attainment"],
  exam:      ["gcse", "a-level", "assessment", "test"],
  exams:     ["gcse", "a-level", "assessment", "tests"],
  club:      ["co-curricular", "activities", "society", "sport"],
  clubs:     ["co-curricular", "activities", "societies", "sports"],
  trip:      ["visits", "travel", "expedition", "tour"],
  trips:     ["visits", "travel", "expeditions", "tours"],
  contact:   ["address", "phone", "email", "telephone"],
  location:  ["address", "directions", "map", "elstree"],
  bus:       ["transport", "travel", "coach", "minibus"],
  transport: ["bus", "travel", "coach", "minibus"],
};

function expandQuery(query: string): string {
  const terms = tokenize(query);
  const extra = new Set<string>();
  for (const term of terms) {
    const synonyms = SYNONYM_MAP[term];
    if (synonyms) {
      for (const s of synonyms) extra.add(s);
    }
  }
  if (extra.size === 0) return query;
  return query + " " + [...extra].join(" ");
}

function buildBM25Index() {
  docFreqs = new Map();
  docTermFreqs = [];
  let totalLength = 0;

  for (const chunk of chunks) {
    const text = chunk.title + " " + chunk.text;
    const terms = tokenize(text);
    totalLength += terms.length;

    const tf = new Map<string, number>();
    const seen = new Set<string>();
    for (const t of terms) {
      tf.set(t, (tf.get(t) ?? 0) + 1);
      if (!seen.has(t)) {
        seen.add(t);
        docFreqs.set(t, (docFreqs.get(t) ?? 0) + 1);
      }
    }
    docTermFreqs.push({ terms: tf, length: terms.length });
  }

  avgDocLength = chunks.length > 0 ? totalLength / chunks.length : 1;
}

function bm25Score(queryTerms: string[], docIdx: number): number {
  const N = chunks.length;
  const doc = docTermFreqs[docIdx];
  let score = 0;

  for (const term of queryTerms) {
    const df = docFreqs.get(term) ?? 0;
    if (df === 0) continue;

    const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
    const tf = doc.terms.get(term) ?? 0;
    const tfNorm = (tf * (BM25_K1 + 1)) / (tf + BM25_K1 * (1 - BM25_B + BM25_B * (doc.length / avgDocLength)));
    score += idf * tfNorm;
  }

  return score;
}

function bm25Search(query: string, topK: number): { chunk: Chunk; score: number }[] {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];

  const scored = chunks.map((chunk, i) => ({ chunk, score: bm25Score(queryTerms, i) }));
  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

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

// ── Hybrid search: BM25 + cosine similarity ─────────────────────────────────

const BM25_WEIGHT = 0.3325;
const VECTOR_WEIGHT = 0.6675;
const TITLE_BOOST = 0.22;
const SECTION_BOOST = 0.1;
// Maximum score achievable: used to express results as absolute percentages
// rather than min-max relative ones, so displayed % reflects true relevance.
const MIN_SCORE_THRESHOLD = 0.05;
const MAX_FUSED_SCORE = BM25_WEIGHT + VECTOR_WEIGHT + TITLE_BOOST + SECTION_BOOST; // 1.32

// Terms that signal each topic area — used to boost chunks from the matching section
const SECTION_SIGNALS: Record<string, Set<string>> = {
  Financial: new Set([
    "financial", "finance", "fee", "fees", "tuition", "cost", "costs", "price", "prices",
    "pay", "paying", "payment", "afford", "affordable", "bursary", "bursaries", "funding",
    "scholarship", "scholarships", "money", "cheap", "assistance", "award",
  ]),
  Admissions: new Set([
    "apply", "applying", "application", "admissions", "enrol", "enroll", "entry",
    "joining", "register", "admission", "intake", "open", "day",
  ]),
  Academic: new Set([
    "subjects", "subject", "curriculum", "gcse", "a-level", "diploma", "academic",
    "exam", "exams", "grades", "grade", "results", "courses", "course", "sixth",
  ]),
  "Co-Curricular": new Set([
    "sport", "sports", "club", "clubs", "activities", "trip", "trips", "co-curricular",
    "music", "drama", "art", "society", "societies",
  ]),
};

function sectionBoost(queryTerms: string[], chunkSection: string): number {
  const signals = SECTION_SIGNALS[chunkSection];
  if (!signals) return 0;
  for (const term of queryTerms) {
    if (signals.has(term)) return SECTION_BOOST;
  }
  return 0;
}


function titleMatchBoost(queryTerms: string[], chunkTitle: string): number {
  const titleTerms = new Set(tokenize(chunkTitle));
  if (titleTerms.size === 0 || queryTerms.length === 0) return 0;
  let matches = 0;
  for (const qt of queryTerms) {
    if (titleTerms.has(qt)) matches++;
  }
  // Normalise by query length so longer, more descriptive titles aren't
  // penalised relative to short ones that happen to match a single term.
  return (matches / queryTerms.length) * TITLE_BOOST;
}

async function hybridSearch(query: string, topK: number) {
  const expandedQuery = expandQuery(query);

  // BM25 leg — always available
  const queryTerms = tokenize(expandedQuery);
  const bm25Candidates = chunks
    .map((chunk, i) => ({ idx: i, chunk, score: bm25Score(queryTerms, i) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK * 3); // over-fetch for fusion

  const hasEmbeddings = embedderReady && embedder && chunks.length > 0 && chunks[0].embedding.length > 0;

  // Normalise BM25 scores to [0, 1] against the top raw score so that
  // the absolute magnitude is preserved across different queries.
  const bm25Max = bm25Candidates.length > 0 ? bm25Candidates[0].score : 1;
  const bm25NormMap = new Map(bm25Candidates.map((r) => [r.idx, r.score / bm25Max]));

  if (!hasEmbeddings) {
    // Embedder not ready — BM25 only
    return bm25Candidates.slice(0, topK).map((r) => ({
      chunk: r.chunk,
      score: ((bm25NormMap.get(r.idx) ?? 0) * BM25_WEIGHT + sectionBoost(queryTerms, r.chunk.section)) / MAX_FUSED_SCORE,
    }));
  }

  // Vector leg — cosine similarity of L2-normalised vectors is already in [0, 1]
  const output = await embedder(expandedQuery, { pooling: "mean", normalize: true });
  const queryVec = Array.from(output.data as Float32Array) as number[];

  const vectorCandidates = chunks
    .map((chunk, i) => ({ idx: i, chunk, score: cosineSim(queryVec, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK * 3);

  const vecNormMap = new Map(vectorCandidates.map((r) => [r.idx, r.score]));

  // Merge all candidate indices
  const allIdxs = new Set<number>();
  for (const c of bm25Candidates) allIdxs.add(c.idx);
  for (const c of vectorCandidates) allIdxs.add(c.idx);

  // Weighted fusion + title-match boost + section boost, divided by the
  // theoretical maximum so the returned score is an absolute [0, 1] value.
  const fused: { chunk: Chunk; score: number }[] = [];
  for (const idx of allIdxs) {
    const bScore = bm25NormMap.get(idx) ?? 0;
    const vScore = vecNormMap.get(idx) ?? 0;
    const tBoost = titleMatchBoost(queryTerms, chunks[idx].title);
    const sBoost = sectionBoost(queryTerms, chunks[idx].section);
    fused.push({
      chunk: chunks[idx],
      score: (BM25_WEIGHT * bScore + VECTOR_WEIGHT * vScore + tBoost + sBoost) / MAX_FUSED_SCORE,
    });
  }

  return fused.sort((a, b) => b.score - a.score).slice(0, topK);
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

    // Extract source URL before stripping it from the text
    const sourceMatch = section.match(/\*\*Source:\*\*\s*(https?:\/\/\S+)/m);
    const url = sourceMatch ? sourceMatch[1].trim() : undefined;

    const text = section
      .replace(/^## .+$/m, "")
      .replace(/\*\*Source:\*\*.+$/gm, "")
      .replace(/^#.+$/m, "")
      .trim();

    if (!text || text.length < 20) continue;

    const wordCount = text.split(/\s+/).length;
    const estimatedTokens = Math.round(wordCount * 1.3);

    if (estimatedTokens > 500) {
      const paragraphs = text.split(/\n\n+/);
      let buffer = "";
      let subIndex = 0;

      for (const para of paragraphs) {
        const combined = buffer ? buffer + "\n\n" + para : para;
        if (buffer && combined.split(/\s+/).length * 1.3 > 450) {
          result.push({
            text: buffer,
            title: subIndex === 0 ? title : `${title} (cont.)`,
            embedding: [],
            section: classifySection(title),
            chunkIndex: chunkIndex++,
            url,
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
          url,
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
        url,
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

  // Build BM25 index over loaded chunks
  if (chunks.length > 0) {
    buildBM25Index();
  }

  // Signal ready — BM25 search works from here, hybrid once embedder loads
  self.postMessage({ type: "orama-ready" });

  // 3. Lazy-load the embedder (~23 MB ONNX download).
  //    Dynamic import() avoids crashing the worker at module load time if
  //    @huggingface/transformers has internal init errors.
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
    console.warn("Embedder unavailable, using BM25-only search:", e);
    self.postMessage({ type: "embedder-fallback" });
  }
}

// ── Search handler ────────────────────────────────────────────────────────────

async function handleSearch(query: string, id: string) {
  const topK = 3;

  const results = await hybridSearch(query, topK);

  const mapped = results
    .filter((r) => r.score > MIN_SCORE_THRESHOLD)
    .map((r) => ({
      chunk: { title: r.chunk.title, text: r.chunk.text, chunkIndex: r.chunk.chunkIndex, url: r.chunk.url },
      score: r.score,
    }));

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
