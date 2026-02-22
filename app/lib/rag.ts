import { streamGroqCompletion, type GroqMessage } from "./groq";
import type { SearchResult } from "./types";

const SYSTEM_PROMPT = `You are Beri, the AI assistant for Haberdashers' Boys' School (Habs Boys) in Elstree, Hertfordshire. Answer questions using ONLY the provided context. Quote exact figures for dates, fees, percentages, and grades. If the context doesn't contain the answer, say "I don't have that information — please contact the school directly at 020 8266 1700 or admissionsboys@habselstree.org.uk." Keep answers to 1–3 sentences unless the question requires more detail.`;

export class RAGOrchestrator {
  private retrievalWorker: Worker;
  private history: GroqMessage[] = [];
  private reasoningMode = false;

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
          resolve(e.data.results ?? []);
        }
      };
      this.retrievalWorker.addEventListener("message", handler);
      this.retrievalWorker.postMessage({ type: "search", query, id });
    });
  }

  buildMessages(userQuery: string, sources: SearchResult[]): GroqMessage[] {
    const contextBlock = sources
      .map((r) => `[${r.chunk.title}]\n${r.chunk.text}`)
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
    onReasoning?: (text: string) => void,
  ): Promise<{ fullText: string; sources: SearchResult[] }> {
    // 1. Retrieve (local, ~30ms)
    const sources = await this.search(userQuery);

    // 2. Build messages
    const messages = this.buildMessages(userQuery, sources);

    // 3. Stream from Groq
    const fullText = await new Promise<string>((resolve, reject) => {
      streamGroqCompletion({
        messages,
        includeReasoning: this.reasoningMode,
        onChunk,
        onReasoning,
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
