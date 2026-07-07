export function getFrontendUrl(): string {
  return process.env.FRONTEND_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export function personaAvatarUrl(filename: string): string {
  return `${getFrontendUrl()}/personas/${filename}`;
}
