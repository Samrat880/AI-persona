/** Dynamic per-run context only — keep small to save input tokens. */
export function getAdditionalRunInstructions(
  youtubeContext = ""
): string {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const parts: string[] = [`**Today:** ${currentDate}`];

  if (youtubeContext.trim()) {
    parts.push(youtubeContext.trim());
  }

  return parts.join("\n\n");
}
