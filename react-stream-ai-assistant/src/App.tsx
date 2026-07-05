import { AuthenticatedApp } from "@/components/authenticated-app";
import { Login } from "@/components/login";
import { Toaster } from "@/components/ui/toaster";
import {
  clearSessionData,
  getStoredUser,
  USER_STORAGE_KEY,
} from "@/lib/persistence";
import { ThemeProvider } from "@/providers/theme-provider";
import { useState } from "react";
import { User } from "stream-chat";

function App() {
  const [user, setUser] = useState<User | null>(() => getStoredUser<User>());

  const handleUserLogin = (authenticatedUser: User) => {
    const avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${authenticatedUser.name}`;
    const userWithImage = {
      ...authenticatedUser,
      image: avatarUrl,
    };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userWithImage));
    setUser(userWithImage);
  };

  const handleLogout = () => {
    clearSessionData();
    setUser(null);
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="h-screen bg-background">
        {user ? (
          <AuthenticatedApp user={user} onLogout={handleLogout} />
        ) : (
          <Login onLogin={handleUserLogin} />
        )}

        <Toaster />
      </div>
    </ThemeProvider>
  );
}

export default App;
