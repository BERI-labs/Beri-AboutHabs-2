export interface ReportParams {
  lastUserText: string;
  lastBotText: string;
  citations?: { title: string; url?: string; score: number }[];
}

/**
 * Build a mailto: URL for the "Report this answer" feature.
 * Body is pre-filled with timestamp, page URL, user agent, and the last Q&A pair.
 */
export function buildReportMailto({
  lastUserText,
  lastBotText,
  citations,
}: ReportParams): string {
  const NA = "(not available)";
  const to = "beri.ai.model@gmail.com";
  const subject = "BERI feedback \u2013 flagged output";

  const timestamp = new Date().toLocaleString();
  const pageUrl =
    typeof window !== "undefined" ? window.location.href : NA;
  const userAgent =
    typeof window !== "undefined" ? navigator.userAgent : NA;

  const citationLines =
    citations && citations.length > 0
      ? citations
          .map(
            (c, i) =>
              `  ${i + 1}. ${c.title}${c.url ? ` \u2014 ${c.url}` : ""} (${(c.score * 100).toFixed(0)}% match)`
          )
          .join("\r\n")
      : "  (none)";

  const body = [
    `Timestamp: ${timestamp}`,
    `Page URL: ${pageUrl}`,
    `App version: 1.0.0`,
    `User agent: ${userAgent}`,
    ``,
    `--- Last user message ---`,
    lastUserText || NA,
    ``,
    `--- Bot response ---`,
    lastBotText || NA,
    ``,
    `--- Citations ---`,
    citationLines,
    ``,
    `--- Additional notes (optional) ---`,
    ``,
  ].join("\r\n");

  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
