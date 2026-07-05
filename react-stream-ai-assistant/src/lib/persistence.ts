import {
  DEFAULT_PERSONA_ID,
  isValidPersonaId,
  type PersonaId,
} from "@/config/personas";

export const USER_STORAGE_KEY = "chat-ai-app-user";
export const LAST_CHANNEL_ROUTE_KEY = "chat-ai-app-last-route";
export const DEFAULT_PERSONA_KEY = "chat-ai-app-default-persona";

const LEGACY_PERSONA_MAP: Record<string, PersonaId> = {
  persona_a: "hitesh",
  persona_b: "piyush",
};

function migratePersonaId(stored: string | null): PersonaId | null {
  if (!stored) return null;
  if (isValidPersonaId(stored)) return stored;
  if (stored in LEGACY_PERSONA_MAP) return LEGACY_PERSONA_MAP[stored];
  return null;
}

export function personaStorageKey(channelId: string) {
  return `chat-ai-app-persona:${channelId}`;
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function getDefaultPersonaId(): PersonaId {
  const stored = localStorage.getItem(DEFAULT_PERSONA_KEY);
  const migrated = migratePersonaId(stored);
  if (migrated) {
    if (stored !== migrated) {
      localStorage.setItem(DEFAULT_PERSONA_KEY, migrated);
    }
    return migrated;
  }
  return DEFAULT_PERSONA_ID;
}

export function setDefaultPersonaId(personaId: PersonaId) {
  localStorage.setItem(DEFAULT_PERSONA_KEY, personaId);
}

export function getChannelPersonaId(channelId: string): PersonaId | null {
  const stored = localStorage.getItem(personaStorageKey(channelId));
  const migrated = migratePersonaId(stored);
  if (migrated) {
    if (stored !== migrated) {
      localStorage.setItem(personaStorageKey(channelId), migrated);
    }
    return migrated;
  }
  return null;
}

export function setChannelPersonaId(channelId: string, personaId: PersonaId) {
  localStorage.setItem(personaStorageKey(channelId), personaId);
}

export function resolvePersonaId(channelId?: string | null): PersonaId {
  if (channelId) {
    const channelPersona = getChannelPersonaId(channelId);
    if (channelPersona) return channelPersona;
  }
  return getDefaultPersonaId();
}

export function persistPersonaSelection(
  personaId: PersonaId,
  channelId?: string | null
) {
  setDefaultPersonaId(personaId);
  if (channelId) {
    setChannelPersonaId(channelId, personaId);
  }
}

export function getLastChannelRoute(): string | null {
  return localStorage.getItem(LAST_CHANNEL_ROUTE_KEY);
}

export function setLastChannelRoute(route: string) {
  localStorage.setItem(LAST_CHANNEL_ROUTE_KEY, route);
}

export function clearSessionData() {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(LAST_CHANNEL_ROUTE_KEY);
  localStorage.removeItem(DEFAULT_PERSONA_KEY);

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("chat-ai-app-persona:")) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export function getStoredUser<T>() {
  return safeParse<T>(localStorage.getItem(USER_STORAGE_KEY));
}
