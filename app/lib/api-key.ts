export function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_GROQ_API_KEY is not set. " +
        "Add it as a GitHub Repository Secret (for CI) or in .env.local (for local dev).",
    );
  }
  return key;
}
