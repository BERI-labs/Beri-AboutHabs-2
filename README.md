# Beri — Haberdashers' Boys' School AI Assistant

Beri is a browser-based AI assistant for Habs Boys, powered by Groq (GPT-OSS 20B) with fully local hybrid search (Orama BM25 + Transformers.js vector search). No server required — it deploys as a static site to GitHub Pages.

## Setup

### 1. Add your Groq API key as a GitHub Repository Secret

1. Go to your repo → **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `GROQ_API_KEY` · Value: your key from [console.groq.com/keys](https://console.groq.com/keys)
4. Save.

Every push to `main` will automatically build and deploy Beri to GitHub Pages with the key injected at build time.

### 2. Enable GitHub Pages

1. Go to **Settings → Pages**
2. Set **Source** to **GitHub Actions**

### 3. (Optional) Replace the placeholder logo

Drop `beri-logo.png` and `favicon.png` into `public/` to replace the SVG placeholders. The app's `onError` handlers fall back gracefully to emoji if images are missing.

## Local development

```bash
# Install dependencies
npm install

# Add your key
echo "NEXT_PUBLIC_GROQ_API_KEY=gsk_your_key_here" > .env.local

# Build the knowledge index (embeds chunks with all-MiniLM-L6-v2, ~1 min)
npm run build:index

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
Browser
├── Main thread: React UI + RAGOrchestrator
├── Web Worker: Orama (BM25 + hybrid) + Transformers.js (all-MiniLM-L6-v2, ~23 MB ONNX)
└── fetch → Groq API (openai/gpt-oss-20b, ~1,000 tok/s streaming)
```

- **Retrieval is 100% local** — only the final prompt is sent to Groq.
- **Cold start**: ~1–3s to load the 23 MB embedding model (cached after first visit).
- **Warm start**: < 500ms (IndexedDB + browser cache).
- **Cost**: ~$0.00013/query · ~$0.13/1,000 queries.

## Updating the knowledge base

Edit `knowledge/habs.md`, then push to `main`. The deploy workflow runs `npm run build:index` automatically, re-embedding all chunks.
