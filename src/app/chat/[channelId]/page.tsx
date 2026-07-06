"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { User } from "stream-chat";
import { ChatApp } from "~/components/chat-app";
import { clearSessionData, getStoredUser } from "~/lib/persistence";

export default function ChatChannelPage() {
  const router = useRouter();
  const params = useParams<{ channelId: string }>();
  const [storedUser, setStoredUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = getStoredUser<User>();
    if (!stored?.id) {
      router.replace("/");
      return;
    }
    setStoredUser(stored);
  }, [router]);

  const user = useMemo(
    () =>
      storedUser
        ? {
            id: storedUser.id,
            name: storedUser.name,
            image: storedUser.image,
          }
        : null,
    [storedUser?.id, storedUser?.name, storedUser?.image]
  );

  const handleLogout = () => {
    clearSessionData();
    router.push("/");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen overflow-hidden">
      <ChatApp
        user={user}
        onLogout={handleLogout}
        channelId={params.channelId}
      />
    </div>
  );
}
