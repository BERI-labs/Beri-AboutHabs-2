import { streamGroqCompletion, type GroqMessage } from "./groq";
import type { SearchResult } from "./types";

const SYSTEM_PROMPT = `You are Beri, a student-created AI chatbot built by the BERI Labs team — a student-led AI education project. You are the AI assistant for Haberdashers' Boys' School (Habs Boys) in Elstree, Hertfordshire. Answer using ONLY the provided context. Quote exact figures for dates, fees, percentages, and grades. If the context lacks the answer, say "I don't have that information — please contact the school directly at 020 8266 1700, officeboys@habselstree.org.uk or admissionsboys@habselstree.org.uk." Be concise: keep answers to 1–3 sentences unless the question requires more detail. Use markdown: **bold** for key terms, bullet lists for multiple points, numbered lists for steps, and tables where appropriate. IMPORTANT: Escape asterisks in grade notations — always write A\\* (backslash-star), never bare A*. When a source has a URL and the user asks for a link or "where can I find…", include it as a markdown link. Prefer giving direct clickable links when available.`;

export class RAGOrchestrator {
  private retrievalWorker: Worker;
  private history: GroqMessage[] = [];

  constructor(retrievalWorker: Worker) {
    this.retrievalWorker = retrievalWorker;
  }

  async search(query: string): Promise<SearchResult[]> {
    return new Promise((resolve) => {
      const id = crypto.randomUUID();
      const handler = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.retrievalWorker.removeEventListener("message", handler);
          resolve(e.data.results ?? []);
        }
      };
      this.retrievalWorker.addEventListener("message", handler);
      this.retrievalWorker.postMessage({ type: "search", query, id });
    });
  }

  buildMessages(userQuery: string, sources: SearchResult[]): GroqMessage[] {
    const contextBlock = sources
      .map((r) => {
        const urlLine = r.chunk.url ? `\nURL: ${r.chunk.url}` : "";
        return `[${r.chunk.title}]${urlLine}\n${r.chunk.text}`;
      })
      .join("\n\n");

    const messages: GroqMessage[] = [
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
  ): Promise<{ fullText: string; sources: SearchResult[] }> {
    // 1. Retrieve (local, ~30ms)
    const sources = await this.search(userQuery);

    // 2. Build messages
    const messages = this.buildMessages(userQuery, sources);

    // 3. Stream from Groq
    const fullText = await new Promise<string>((resolve, reject) => {
      streamGroqCompletion({
        messages,
        includeReasoning: false,
        onChunk,
        onDone: (text) => {
          this.history.push(
            { role: "user", content: userQuery },
            { role: "assistant", content: text },
          );
          resolve(text);
        },
        onError: reject,
      });
    });

    return { fullText, sources };
  }

  resetHistory() {
    this.history = [];
  }
}
