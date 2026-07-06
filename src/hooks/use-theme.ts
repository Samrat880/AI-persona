"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("guru-chat-theme") as Theme | null;
    const initial = stored === "light" ? "light" : "dark";
    setThemeState(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    localStorage.setItem("guru-chat-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return { theme, setTheme };
}
