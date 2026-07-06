import type { Channel, Event, StreamChat } from "stream-chat";

export type BotChannelEvent = Omit<Event, "user" | "user_id"> & {
  type: Event["type"];
};

export function sendBotChannelEvent(
  channel: Channel,
  botUserId: string,
  event: BotChannelEvent
) {
  return channel.sendEvent({ ...event, user_id: botUserId });
}

export function updateBotMessageText(
  client: StreamChat,
  messageId: string,
  botUserId: string,
  text: string,
  final = false,
  customPatch?: Record<string, unknown>
) {
  const set: Record<string, unknown> = {
    text,
    generating: !final,
    ...customPatch,
  };

  return client
    .partialUpdateMessage(messageId, { set }, botUserId)
    .catch((err: unknown) => {
      console.error(
        "[stream] partialUpdateMessage failed:",
        err instanceof Error ? err.message : String(err)
      );
    });
}
