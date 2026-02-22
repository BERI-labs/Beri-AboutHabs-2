import { getApiKey } from "./api-key";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqStreamOptions {
  messages: GroqMessage[];
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
    const apiKey = getApiKey();

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages,
        temperature: 0.3,
        max_completion_tokens: 512,
        stream: true,
        include_reasoning: includeReasoning,
        reasoning_effort: "low",
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const status = response.status;
      let message = errorBody?.error?.message || `Groq API error: ${status}`;

      if (status === 401) {
        message = "Beri's API key is invalid. Please contact the site administrator.";
      } else if (status === 429) {
        message = "Beri is being used too quickly. Please wait a moment and try again.";
      } else if (status === 503) {
        message = "The AI service is temporarily unavailable. Please try again shortly.";
      }

      throw new Error(message);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let reasoningText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;

          if (delta?.content) {
            fullText += delta.content;
            onChunk(fullText);
          }

          if (delta?.reasoning && onReasoning) {
            reasoningText += delta.reasoning;
            onReasoning(reasoningText);
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
