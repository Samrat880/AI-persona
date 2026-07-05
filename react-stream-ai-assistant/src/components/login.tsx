import { PERSONA_LIST } from "@/config/personas";
import { sha256 } from "js-sha256";
import React, { useState } from "react";
import { User } from "stream-chat";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface LoginProps {
  onLogin: (user: User) => void;
}

const createUserIdFromUsername = (username: string): string => {
  const hash = sha256(username.toLowerCase().trim());
  return `user_${hash.substring(0, 12)}`;
};

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      const user = {
        id: createUserIdFromUsername(username.trim().toLowerCase()),
        name: username.trim(),
      };
      onLogin(user);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
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
              mentors. Switch between them anytime. Your session is saved on
              refresh.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <Input
                id="username"
                placeholder="Enter your name..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-10"
              />
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSubmit}
            className="w-full h-10"
            disabled={!username.trim()}
          >
            Start Chatting
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
