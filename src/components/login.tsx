import { PERSONA_LIST } from "~/config/personas";
import { createChatUserFromUsername } from "~/lib/create-chat-user";
import React, { useState } from "react";
import type { User } from "stream-chat";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

interface LoginProps {
  onLogin: (user: User) => void;
  existingUser?: User | null;
  onContinueChat?: () => void;
  onLogout?: () => void;
}

export const Login: React.FC<LoginProps> = ({
  onLogin,
  existingUser,
  onContinueChat,
  onLogout,
}) => {
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(createChatUserFromUsername(username));
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      {existingUser?.name && onContinueChat && (
        <div className="mb-4 flex w-full max-w-md flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-sm text-foreground">
            Logged in as <span className="font-semibold">{existingUser.name}</span>
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={onContinueChat}>
              Continue chatting
            </Button>
            {onLogout && (
              <Button size="sm" variant="outline" onClick={onLogout}>
                Log out
              </Button>
            )}
          </div>
        </div>
      )}
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            {PERSONA_LIST.map((persona) => (
              <div key={persona.id} className="flex flex-col items-center gap-1.5">
                <img
                  src={persona.avatarUrl}
                  alt={persona.name}
                  className="h-16 w-16 rounded-2xl object-cover ring-2 ring-primary/20 shadow-md"
                />
                <span className="text-xs font-medium text-foreground">
                  {persona.name}
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl font-semibold">
              Learn from your gurus
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Chat with Hitesh (ChaiCode) or Piyush (TeachMe) — your web dev
              mentors. Switch between them anytime.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter your name..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={!username.trim()}
          >
            Start Chatting
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
