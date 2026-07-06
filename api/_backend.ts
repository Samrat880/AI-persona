/** Load compiled backend modules (available after `npm run build`). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadBackend<T = any>(modulePath: string): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`../nodejs-ai-assistant/dist/${modulePath}`) as T;
}
