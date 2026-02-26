export type AppState = "loading" | "welcome" | "chatting" | "error";

export interface ChunkDoc {
  text: string;
  title: string;
  embedding: number[];
  section: string;
  chunkIndex: number;
  url?: string;
}

export interface SearchResult {
  chunk: {
    title: string;
    text: string;
    chunkIndex: number;
    url?: string;
  };
  score: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  sources?: SearchResult[];
  isStreaming?: boolean;
}

export interface WorkerMessage {
  type:
    | "init"
    | "search"
    | "orama-ready"
    | "embedder-ready"
    | "embedder-progress"
    | "embedder-fallback"
    | "search-results";
  query?: string;
  id?: string;
  results?: SearchResult[];
  progress?: number;
  error?: string;
}
