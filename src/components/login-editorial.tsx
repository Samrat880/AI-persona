"use client";

import {
  DEFAULT_PERSONA_ID,
  getPersona,
  PERSONA_LIST,
  type PersonaId,
} from "~/config/personas";
import { FloatingTechWord } from "~/components/landing-floating-words";
import { createChatUserFromUsername } from "~/lib/create-chat-user";
import {
  getDefaultPersonaId,
  setDefaultPersonaId,
} from "~/lib/persistence";
import { Bebas_Neue } from "next/font/google";
import { useEffect, useState } from "react";
import type { User } from "stream-chat";
import "~/styles/landing-editorial.css";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

interface LoginEditorialProps {
  onLogin: (user: User) => void;
  existingUser?: User | null;
  onContinueChat?: () => void;
  onLogout?: () => void;
}

function RedBars({ className }: { className: string }) {
  return (
    <div className={className}>
      <span className="landing-editorial__bar" />
      <span className="landing-editorial__bar" />
      <span className="landing-editorial__bar" />
      <span className="landing-editorial__bar" />
    </div>
  );
}

export function LoginEditorial({
  onLogin,
  existingUser,
  onContinueChat,
  onLogout,
}: LoginEditorialProps) {
  const [personaId, setPersonaId] = useState<PersonaId>(DEFAULT_PERSONA_ID);
  const [username, setUsername] = useState("");

  useEffect(() => {
    setPersonaId(getDefaultPersonaId());
  }, []);

  const persona = getPersona(personaId);

  const handlePersonaChange = (id: PersonaId) => {
    setPersonaId(id);
    setDefaultPersonaId(id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      setDefaultPersonaId(personaId);
      onLogin(createChatUserFromUsername(username));
    }
  };

  return (
    <div className={`landing-editorial ${bebas.variable}`}>
      <div className="landing-editorial__inner">
        {existingUser?.name && onContinueChat && (
          <div className="landing-editorial__resume">
            <p className="landing-editorial__resume-text">
              Logged in as <strong>{existingUser.name}</strong>
            </p>
            <div className="landing-editorial__resume-actions">
              <button
                type="button"
                className="landing-editorial__resume-continue"
                onClick={onContinueChat}
              >
                Continue chatting
              </button>
              {onLogout && (
                <button
                  type="button"
                  className="landing-editorial__resume-logout"
                  onClick={onLogout}
                >
                  Log out
                </button>
              )}
            </div>
          </div>
        )}

        <header className="landing-editorial__header">
          <div className="landing-editorial__topline">
            <span>learn</span>
            <span>quietly</span>
            <span>build</span>
          </div>

          <div className="landing-editorial__personas">
            {PERSONA_LIST.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`landing-editorial__persona-btn${
                  p.id === personaId ? " landing-editorial__persona-btn--active" : ""
                }`}
                onClick={() => handlePersonaChange(p.id)}
              >
                <img src={p.avatarUrl} alt="" />
                {p.name}
              </button>
            ))}
          </div>
        </header>

        <section className="landing-editorial__hero" aria-label="Guru hero">
          <h1 className="landing-editorial__headline" aria-hidden="true">
            {persona.landingHeadline}
          </h1>

          <FloatingTechWord
            className="landing-editorial__float-word--l1"
            startIndex={0}
            intervalMs={2400}
          />
          <FloatingTechWord
            className="landing-editorial__float-word--l2"
            startIndex={7}
            intervalMs={2800}
          />
          <FloatingTechWord
            className="landing-editorial__float-word--r1"
            startIndex={14}
            intervalMs={3000}
          />
          <FloatingTechWord
            className="landing-editorial__float-word--r2"
            startIndex={21}
            intervalMs={2600}
          />

          <RedBars className="landing-editorial__bars landing-editorial__bars--right" />

          <div className="landing-editorial__badge">
            <span className="landing-editorial__badge-dot" />
            Guru Ji
          </div>

          <div className="landing-editorial__figure-wrap">
            <RedBars className="landing-editorial__bars landing-editorial__bars--left" />
            <span className="landing-editorial__number">01</span>
            <img
              src={persona.landingHeroUrl}
              alt={`Chat with ${persona.name}`}
              className="landing-editorial__figure"
            />
          </div>

          <a href="#chat-start" className="landing-editorial__scroll-hint">
            <span>Scroll to chat</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </a>
        </section>

        <section id="chat-start" className="landing-editorial__chat" aria-label="Start chatting">
          <div className="landing-editorial__chat-watermark" aria-hidden="true">
            Guru Ji
          </div>

          <div className="landing-editorial__chat-inner">
            <div className="landing-editorial__chat-meta">
              <div className="landing-editorial__chat-meta-left">
                <span className="landing-editorial__chat-index">02</span>
                <RedBars className="landing-editorial__bars landing-editorial__chat-bars" />
              </div>
              <span className="landing-editorial__chat-eyebrow">start your session</span>
            </div>

            <div className="landing-editorial__chat-persona">
              <img
                src={persona.avatarUrl}
                alt=""
                className="landing-editorial__chat-avatar"
              />
              <div className="landing-editorial__chat-persona-copy">
                <p className="landing-editorial__chat-kicker">You&apos;re chatting with</p>
                <h2 className="landing-editorial__chat-name">{persona.name}</h2>
                <p className="landing-editorial__chat-tagline">{persona.tagline}</p>
              </div>
            </div>

            <blockquote className="landing-editorial__chat-quote">
              <span className="landing-editorial__chat-quote-mark" aria-hidden="true">
                &ldquo;
              </span>
              <p>Ask anything. Ship something. Learn by building.</p>
            </blockquote>

            <ul className="landing-editorial__chat-starters" aria-label="Example questions">
              {persona.starterPrompts.slice(0, 3).map((prompt) => (
                <li key={prompt} className="landing-editorial__chat-starter">
                  {prompt}
                </li>
              ))}
            </ul>

            <form className="landing-editorial__chat-form" onSubmit={handleSubmit}>
              <label htmlFor="username" className="landing-editorial__chat-label">
                Your name
              </label>
              <div className="landing-editorial__chat-field">
                <input
                  id="username"
                  type="text"
                  className="landing-editorial__chat-input"
                  placeholder="e.g. Samrat"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
                <button
                  type="submit"
                  className="landing-editorial__chat-submit"
                  disabled={!username.trim()}
                  aria-label="Start chatting"
                >
                  <span>Enter</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </form>

            <footer className="landing-editorial__chat-foot">
              <span>guru ji</span>
              <span className="landing-editorial__chat-foot-rule" aria-hidden="true" />
              <span>free · instant · no signup</span>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}
