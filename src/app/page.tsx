"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "stream-chat";
import { LANDING_VARIANT } from "~/config/landing";
import { Login } from "~/components/login";
import { LoginEditorial } from "~/components/login-editorial";
import { LoadingScreen } from "~/components/loading-screen";
import {
  clearSessionData,
  getLastChannelRoute,
  getStoredUser,
  setStoredUser,
} from "~/lib/persistence";

export default function HomePage() {
  const router = useRouter();
  const [existingUser, setExistingUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setExistingUser(getStoredUser<User>());
    setReady(true);

    if (LANDING_VARIANT === "editorial") {
      const prev = document.documentElement.style.overflowY;
      document.documentElement.style.overflowY = "auto";
      document.documentElement.style.scrollBehavior = "smooth";
      return () => {
        document.documentElement.style.overflowY = prev;
        document.documentElement.style.scrollBehavior = "";
      };
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setStoredUser(loggedInUser);
    setExistingUser(loggedInUser);
    router.push("/chat");
  };

  const handleContinueChat = () => {
    router.push(getLastChannelRoute() ?? "/chat");
  };

  const handleLogout = () => {
    clearSessionData();
    setExistingUser(null);
  };

  if (!ready) {
    return <LoadingScreen />;
  }

  const loginProps = {
    onLogin: handleLogin,
    existingUser,
    onContinueChat: handleContinueChat,
    onLogout: handleLogout,
  };

  const LoginView = LANDING_VARIANT === "editorial" ? LoginEditorial : Login;

  return <LoginView {...loginProps} />;
}
