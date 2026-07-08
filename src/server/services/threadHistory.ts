import type OpenAI from "openai";

const DEFAULT_MAX_THREAD_MESSAGES = 24;

/** Drop oldest messages so long chats do not balloon input tokens on every run. */
export async function trimThreadHistory(
  openai: OpenAI,
  threadId: string,
  maxMessages = DEFAULT_MAX_THREAD_MESSAGES
): Promise<void> {
  const list = await openai.beta.threads.messages.list(threadId, {
    order: "asc",
    limit: 100,
  });

  const messages = list.data;
  if (messages.length <= maxMessages) return;

  const toDelete = messages.slice(0, messages.length - maxMessages);
  for (const msg of toDelete) {
    try {
      await openai.beta.threads.messages.del(threadId, msg.id);
    } catch (error) {
      console.warn(`[thread] Failed to delete message ${msg.id}:`, error);
    }
  }

  console.log(
    `[thread] Trimmed ${toDelete.length} old messages from ${threadId} (kept ${maxMessages})`
  );
}
