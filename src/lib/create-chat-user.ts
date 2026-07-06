import { sha256 } from "js-sha256";
import type { User } from "stream-chat";

export function createUserIdFromUsername(username: string): string {
  const hash = sha256(username.toLowerCase().trim());
  return `user_${hash.substring(0, 12)}`;
}

export function createChatUserFromUsername(username: string): User {
  const trimmed = username.trim();
  return {
    id: createUserIdFromUsername(trimmed),
    name: trimmed,
  };
}
