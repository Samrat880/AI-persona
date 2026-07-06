import path from "path";

/** Load compiled backend modules (available after `npm run build`). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadBackend<T = any>(modulePath: string): T {
  const normalized = modulePath.replace(/\.js$/, "");
  const candidates = [
    path.join(process.cwd(), "nodejs-ai-assistant/dist", normalized),
    path.join(__dirname, "..", "nodejs-ai-assistant/dist", normalized),
  ];

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(candidate) as T;
    } catch (error) {
      lastError = error;
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Backend module not found (${modulePath}): ${message}`);
}
