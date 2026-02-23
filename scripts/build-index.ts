import { pipeline } from "@huggingface/transformers";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

interface Chunk {
  text: string;
  title: string;
  embedding: number[];
  section: string;
  chunkIndex: number;
}

function classifySection(title: string): string {
  const t = title.toLowerCase();
  if (
    t.includes("fee") ||
    t.includes("payment") ||
    t.includes("vat") ||
    t.includes("bursar") ||
    t.includes("scholarship")
  )
    return "Financial";
  if (
    t.includes("admissions") ||
    t.includes("entry") ||
    t.includes("occasional") ||
    t.includes("faq") ||
    t.includes("reception") ||
    t.includes("year 3") ||
    t.includes("year 7") ||
    t.includes("year 9") ||
    t.includes("sixth form entry")
  )
    return "Admissions";
  if (
    t.includes("a-level") ||
    t.includes("gcse") ||
    t.includes("sixth form") ||
    t.includes("diploma") ||
    t.includes("senior school") ||
    t.includes("prep school") ||
    t.includes("prep co")
  )
    return "Academic";
  if (
    t.includes("sport") ||
    t.includes("performance") ||
    t.includes("house") ||
    t.includes("facilities")
  )
    return "Co-Curricular";
  if (
    t.includes("history") ||
    t.includes("leader") ||
    t.includes("vision") ||
    t.includes("strategic") ||
    t.includes("overview") ||
    t.includes("structure") ||
    t.includes("contact") ||
    t.includes("affiliations")
  )
    return "About";
  return "General";
}

async function buildIndex() {
  console.log("Loading embedder…");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const embedder = await (pipeline as any)(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2",
    { dtype: "q8" },
  );

  console.log("Parsing dataset…");
  const raw = readFileSync("Haberdashers_Boys_School_Dataset_Improved.md", "utf-8")
    .replace(/\r\n/g, "\n");
  const sections = raw.split(/\n---\n/).filter((s) => s.trim());

  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  async function embed(text: string): Promise<number[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output = await (embedder as any)(text, {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(output.data as Float32Array);
  }

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
          const embedding = await embed(buffer);
          chunks.push({
            text: buffer,
            title: subIndex === 0 ? title : `${title} (cont.)`,
            embedding,
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
        const embedding = await embed(buffer);
        chunks.push({
          text: buffer,
          title: subIndex === 0 ? title : `${title} (cont.)`,
          embedding,
          section: classifySection(title),
          chunkIndex: chunkIndex++,
        });
      }
    } else if (estimatedTokens < 30 && chunks.length > 0) {
      // Merge into previous chunk
      const prev = chunks[chunks.length - 1];
      prev.text += "\n\n" + text;
      prev.embedding = await embed(prev.text);
    } else {
      // Normal chunk
      const embedding = await embed(text);
      chunks.push({
        text,
        title,
        embedding,
        section: classifySection(title),
        chunkIndex: chunkIndex++,
      });
    }

    process.stdout.write(`  ✓ ${title.slice(0, 50)}\n`);
  }

  const outPath = "public/data/knowledge-index.json";
  mkdirSync(dirname(outPath), { recursive: true });
  const json = JSON.stringify(chunks);
  writeFileSync(outPath, json);

  console.log(`\nBuilt ${chunks.length} chunks`);
  console.log(`Output: ${(json.length / 1024).toFixed(1)} KB → ${outPath}`);
}

buildIndex().catch((err) => {
  console.error(err);
  process.exit(1);
});
