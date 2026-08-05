"use client";

import { useState } from "react";
import type { StudyCard } from "@/lib/getDeckForStudy";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function Toggle({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onToggle}
      className={`relative w-10 h-6 rounded-full transition-colors focus-ring shrink-0 ${
        enabled ? "bg-ink" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-paper rounded-full transition-transform ${
          enabled ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}

export default function StudySetup({
  title,
  cards,
  onStart,
}: {
  title: string;
  cards: StudyCard[];
  onStart: (selectedCards: StudyCard[], timerSeconds: number | null) => void;
}) {
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);

  // Held as raw strings while the user is actively typing, so a cleared or
  // temporarily out-of-range value doesn't get silently overwritten
  // mid-keystroke. Only clamped/normalized on blur or on Start.
  const [limitCountInput, setLimitCountInput] = useState(String(Math.min(10, cards.length)));
  const [timerSecondsInput, setTimerSecondsInput] = useState("20");

  function clampLimitCount(raw: string): number {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n)) return Math.min(10, cards.length);
    return Math.max(1, Math.min(cards.length, n));
  }

  function clampTimerSeconds(raw: string): number {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n)) return 20;
    return Math.max(5, Math.min(120, n));
  }

  function handleStart() {
    let selected = [...cards];

    if (limitEnabled) {
      const limitCount = clampLimitCount(limitCountInput);
      // Spaced-repetition-style: never-studied cards first, then whichever
      // were studied longest ago.
      selected.sort((a, b) => {
        if (a.lastStudiedAt === null && b.lastStudiedAt === null) return 0;
        if (a.lastStudiedAt === null) return -1;
        if (b.lastStudiedAt === null) return 1;
        return new Date(a.lastStudiedAt).getTime() - new Date(b.lastStudiedAt).getTime();
      });
      selected = selected.slice(0, Math.min(limitCount, selected.length));
    }

    if (shuffleEnabled) {
      selected = shuffle(selected);
    }

    onStart(selected, timerEnabled ? clampTimerSeconds(timerSecondsInput) : null);
  }

  return (
    <div className="pt-16 max-w-md">
      <p className="font-display text-xs text-margin uppercase tracking-widest mb-3">
        study setup
      </p>
      <h1 className="font-display font-bold text-ink text-2xl mb-8">{title}</h1>

      <div className="space-y-6 mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-ink font-medium">Shuffle cards</p>
            <p className="text-xs text-muted mt-0.5">Study in random order.</p>
          </div>
          <Toggle
            enabled={shuffleEnabled}
            onToggle={() => setShuffleEnabled((v) => !v)}
            label="Shuffle cards"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink font-medium">Limit cards this session</p>
              <p className="text-xs text-muted mt-0.5">
                Picks the cards you haven&apos;t studied in the longest.
              </p>
            </div>
            <Toggle
              enabled={limitEnabled}
              onToggle={() => setLimitEnabled((v) => !v)}
              label="Limit cards this session"
            />
          </div>
          {limitEnabled && (
            <div className="flex items-center gap-2 mt-3">
              <input
                type="number"
                min={1}
                max={cards.length}
                value={limitCountInput}
                onChange={(e) => setLimitCountInput(e.target.value)}
                onBlur={() => setLimitCountInput(String(clampLimitCount(limitCountInput)))}
                className="w-20 bg-card border-2 border-border rounded-sm px-3 py-1.5 text-sm text-ink focus-ring"
              />
              <span className="text-xs text-muted">of {cards.length} cards</span>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink font-medium">Per-card timer</p>
              <p className="text-xs text-muted mt-0.5">
                A bar drains as time runs out. It auto-advances if you don&apos;t answer in time.
              </p>
            </div>
            <Toggle
              enabled={timerEnabled}
              onToggle={() => setTimerEnabled((v) => !v)}
              label="Per-card timer"
            />
          </div>
          {timerEnabled && (
            <div className="flex items-center gap-2 mt-3">
              <input
                type="number"
                min={5}
                max={120}
                step={5}
                value={timerSecondsInput}
                onChange={(e) => setTimerSecondsInput(e.target.value)}
                onBlur={() => setTimerSecondsInput(String(clampTimerSeconds(timerSecondsInput)))}
                className="w-20 bg-card border-2 border-border rounded-sm px-3 py-1.5 text-sm text-ink focus-ring"
              />
              <span className="text-xs text-muted">seconds per card</span>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleStart}
        className="bg-ink text-paper px-6 py-3 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring"
      >
        Start studying
      </button>
    </div>
  );
}