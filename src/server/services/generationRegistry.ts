type CancelFn = () => Promise<void>;

/** In-process registry so Stop can cancel the active OpenAI run (server has no Stream WS). */
const activeGenerations = new Map<string, CancelFn>();

export function registerGeneration(messageId: string, cancel: CancelFn) {
  activeGenerations.set(messageId, cancel);
}

export function unregisterGeneration(messageId: string) {
  activeGenerations.delete(messageId);
}

export async function cancelGeneration(messageId: string): Promise<boolean> {
  const cancel = activeGenerations.get(messageId);
  if (!cancel) return false;
  await cancel();
  return true;
}
