import { StreamChat } from "stream-chat";

let serverClientInstance: StreamChat | null = null;

function requireStreamEnv(): { apiKey: string; apiSecret: string } {
  const apiKey = process.env.STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "Missing required environment variables STREAM_API_KEY or STREAM_API_SECRET"
    );
  }

  return { apiKey, apiSecret };
}

export function getApiKey(): string {
  return requireStreamEnv().apiKey;
}

export function getServerClient(): StreamChat {
  if (!serverClientInstance) {
    const { apiKey, apiSecret } = requireStreamEnv();
    serverClientInstance = new StreamChat(apiKey, apiSecret);
  }
  return serverClientInstance;
}
