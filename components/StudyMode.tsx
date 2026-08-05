"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { StudyCard } from "@/lib/getDeckForStudy";
import ResizableImage from "@/components/ResizableImage";
import { createClient } from "@/lib/supabase/client";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Difficulty = "try" | "answered" | "easy";
type Attempt = { cardId: string; correct: boolean };

const TIMEOUT_SENTINEL = "__timeout__";

export default function StudyMode({
  deckId,
  title,
  cards,
  timerSeconds = null,
}: {
  deckId: string;
  title: string;
  cards: StudyCard[];
  timerSeconds?: number | null;
}) {
  const supabase = createClient();

  const [queue, setQueue] = useState<StudyCard[]>(cards);
  const [flipped, setFlipped] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [typedAnswer, setTypedAnswer] = useState("");
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [timedOut, setTimedOut] = useState(false);
  const [timeLeftFraction, setTimeLeftFraction] = useState(1);

  const timerStartRef = useRef<number>(Date.now());

  const CORRECT_MESSAGES = [
    "Correct!",
    "Nice job!",
    "You got it!",
    "That's right!",
    "Exactly right!",
    "Nailed it!",
  ];

  const INCORRECT_MESSAGES = [
    "Not quite.",
    "Close, but not this one.",
    "That's not it.",
    "Almost, but no.",
    "Not this time.",
    "Wrong!",
  ];

  const finished = queue.length === 0;
  const current = !finished ? queue[0] : null;

  // Reset per-card state (choices shuffle + timer) whenever a new card comes up.
  useEffect(() => {
    if (current && current.cardType === "multiple_choice" && current.choices) {
      setShuffledChoices(shuffle(current.choices));
    } else {
      setShuffledChoices([]);
    }
    setTimedOut(false);
    setTimeLeftFraction(1);
    timerStartRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Per-card countdown bar, only runs while timerSeconds is set and the
  // current card hasn't been answered/timed out yet.
  useEffect(() => {
    if (!timerSeconds || !current) return;

    const answered = current.cardType === "flashcard" ? flipped : selectedChoice !== null;
    if (answered || timedOut) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - timerStartRef.current) / 1000;
      const fraction = Math.max(0, 1 - elapsed / timerSeconds);
      setTimeLeftFraction(fraction);
      if (fraction <= 0) {
        clearInterval(interval);
        handleTimeout();
      }
    }, 100);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, timerSeconds, flipped, selectedChoice, timedOut]);

  function recordLastStudied(cardId: string) {
    supabase
      .from("cards")
      .update({ last_studied_at: new Date().toISOString() })
      .eq("id", cardId)
      .then(() => {});
  }

  if (cards.length === 0) {
    return (
      <div className="pt-16 max-w-md">
        <p className="text-sm text-muted mb-4">This deck has no cards yet.</p>
        <Link
          href={`/deck/${deckId}`}
          className="text-sm text-rule hover:text-ink transition-colors focus-ring"
        >
          Back to deck
        </Link>
      </div>
    );
  }

  function handleDifficulty(level: Difficulty) {
    const [current, ...rest] = queue;

    recordLastStudied(current.id);

    // Only flashcards record their outcome here — MC and identification
    // already recorded theirs at the moment they were graded, and this
    // function is also the shared "advance the queue" step for those types,
    // so recording here too would double-count them.
    if (current.cardType === "flashcard" && level !== "answered") {
      setHistory((prev) => [...prev, { cardId: current.id, correct: level === "easy" }]);
    }

    if (level === "easy") {
      setQueue(rest);
    } else {
      const insertPos =
        level === "try" ? Math.min(1, rest.length) : Math.min(4, rest.length);
      setQueue([...rest.slice(0, insertPos), current, ...rest.slice(insertPos)]);
    }

    setFlipped(false);
    setSelectedChoice(null);
    setFeedbackMessage("");
    setTypedAnswer("");
  }

  function handleTimeout() {
    if (!current || timedOut) return;
    const answered = current.cardType === "flashcard" ? flipped : selectedChoice !== null;
    if (answered) return;

    setTimedOut(true);

    if (current.cardType === "flashcard") {
      // No reveal-then-confirm step for flashcards — auto-rate as Try and move on.
      handleDifficulty("try");
    } else {
      recordLastStudied(current.id);
      setSelectedChoice(TIMEOUT_SENTINEL);
      setHistory((prev) => [...prev, { cardId: current.id, correct: false }]);
      setFeedbackMessage("Time's up!");
    }
  }

  function handleChoiceSelect(choice: string) {
    if (selectedChoice !== null || !current) return;
    setSelectedChoice(choice);
    recordLastStudied(current.id);

    const isCorrect = choice === current.back;
    setHistory((prev) => [...prev, { cardId: current.id, correct: isCorrect }]);
    const pool = isCorrect ? CORRECT_MESSAGES : INCORRECT_MESSAGES;
    setFeedbackMessage(pool[Math.floor(Math.random() * pool.length)]);
  }

  function handleTypedSubmit() {
    if (selectedChoice !== null || !current) return;
    const isCorrect = typedAnswer.trim().toLowerCase() === current.back.trim().toLowerCase();
    setSelectedChoice(typedAnswer);
    recordLastStudied(current.id);
    setHistory((prev) => [...prev, { cardId: current.id, correct: isCorrect }]);
    const pool = isCorrect ? CORRECT_MESSAGES : INCORRECT_MESSAGES;
    setFeedbackMessage(pool[Math.floor(Math.random() * pool.length)]);
  }

  function handleChoiceContinue() {
    if (!current) return;
    const correct = !timedOut && selectedChoice === current.back;
    handleDifficulty(correct ? "easy" : "try");
  }

  function restart(shuffled: boolean) {
    setQueue(shuffled ? shuffle(cards) : cards);
    setFlipped(false);
    setSelectedChoice(null);
    setFeedbackMessage("");
    setTypedAnswer("");
    setHistory([]);
  }

  if (finished) {
    const totalAttempts = history.length;
    const correctAttempts = history.filter((h) => h.correct).length;
    const mistakes = totalAttempts - correctAttempts;
    const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : null;

    const cardById = new Map(cards.map((c) => [c.id, c]));

    const perCard = new Map<string, { attempts: number; correct: number; mistakes: number }>();
    for (const h of history) {
      const entry = perCard.get(h.cardId) ?? { attempts: 0, correct: 0, mistakes: 0 };
      entry.attempts += 1;
      if (h.correct) entry.correct += 1;
      else entry.mistakes += 1;
      perCard.set(h.cardId, entry);
    }

    let hardestEntry: { card: StudyCard; stats: { attempts: number; correct: number; mistakes: number } } | null = null;
    let easiestEntry: { card: StudyCard; stats: { attempts: number; correct: number; mistakes: number } } | null = null;

    for (const [cardId, stats] of perCard) {
      const card = cardById.get(cardId);
      if (!card) continue;

      if (stats.mistakes > 0) {
        if (
          !hardestEntry ||
          stats.mistakes > hardestEntry.stats.mistakes ||
          (stats.mistakes === hardestEntry.stats.mistakes && stats.attempts > hardestEntry.stats.attempts)
        ) {
          hardestEntry = { card, stats };
        }
      } else {
        if (!easiestEntry || stats.attempts < easiestEntry.stats.attempts) {
          easiestEntry = { card, stats };
        }
      }
    }

    const toughCards = Array.from(perCard.entries())
      .map(([cardId, stats]) => ({ card: cardById.get(cardId), stats }))
      .filter((t): t is { card: StudyCard; stats: typeof t.stats } => Boolean(t.card) && t.stats.mistakes > 0)
      .sort((a, b) => b.stats.mistakes - a.stats.mistakes)
      .slice(0, 5);

    function cardLabel(card: StudyCard): string {
      return card.front.trim() || (card.frontImage ? "(image)" : "(untitled)");
    }

    return (
      <div className="pt-16 max-w-md">
        <p className="font-display text-xs text-margin uppercase tracking-widest mb-3">
          nice work
        </p>
        <h1 className="font-display font-bold text-ink text-2xl mb-6">
          You finished {title}
        </h1>
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => restart(false)}
            className="bg-ink text-paper px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring"
          >
            Study again
          </button>
          <button
            onClick={() => restart(true)}
            className="border border-border text-ink px-5 py-2.5 rounded-sm text-sm font-medium hover:border-ink transition-colors focus-ring"
          >
            Shuffle and retry
          </button>
        </div>

        {totalAttempts > 0 && (
          <div className="border-t border-border pt-6">
            <p className="font-display text-xs text-muted uppercase tracking-wide mb-3">
              Session stats
            </p>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-card border border-border rounded-sm p-3 text-center">
                <p className="text-2xl font-bold text-ink">{accuracy}%</p>
                <p className="text-[11px] text-muted uppercase tracking-wide mt-1">Avg. accuracy</p>
              </div>
              <div className="bg-card border border-border rounded-sm p-3 text-center">
                <p className="text-2xl font-bold text-ink">{correctAttempts}</p>
                <p className="text-[11px] text-muted uppercase tracking-wide mt-1">Correct</p>
              </div>
              <div className="bg-card border border-border rounded-sm p-3 text-center">
                <p className="text-2xl font-bold text-margin">{mistakes}</p>
                <p className="text-[11px] text-muted uppercase tracking-wide mt-1">Mistakes</p>
              </div>
            </div>

            {(hardestEntry || easiestEntry) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {hardestEntry && (
                  <div className="bg-card border border-margin/40 rounded-sm p-3">
                    <p className="text-[11px] text-margin uppercase tracking-wide mb-1">Hardest card</p>
                    <p className="text-sm text-ink truncate">{cardLabel(hardestEntry.card)}</p>
                    <p className="text-[11px] text-muted mt-1">
                      {hardestEntry.stats.mistakes} miss{hardestEntry.stats.mistakes !== 1 ? "es" : ""} out of{" "}
                      {hardestEntry.stats.attempts} attempt{hardestEntry.stats.attempts !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
                {easiestEntry && (
                  <div className="bg-card border border-border rounded-sm p-3">
                    <p className="text-[11px] text-muted uppercase tracking-wide mb-1">Easiest card</p>
                    <p className="text-sm text-ink truncate">{cardLabel(easiestEntry.card)}</p>
                    <p className="text-[11px] text-muted mt-1">
                      Got it right in {easiestEntry.stats.attempts} attempt
                      {easiestEntry.stats.attempts !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>
            )}

            {toughCards.length > 0 && (
              <div>
                <p className="text-xs text-muted mb-2">Cards that gave you trouble</p>
                <div className="space-y-1.5">
                  {toughCards.map(({ card, stats }) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between bg-card border border-border rounded-sm px-3 py-2"
                    >
                      <span className="text-sm text-ink truncate">{cardLabel(card)}</span>
                      <span className="text-[11px] text-margin shrink-0 ml-2">
                        {stats.mistakes} miss{stats.mistakes !== 1 ? "es" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Link
          href={`/deck/${deckId}`}
          className="block mt-6 text-sm text-muted hover:text-ink transition-colors focus-ring"
        >
          Back to deck
        </Link>
      </div>
    );
  }

  if (!current) return null;

  const isCorrectIdentification =
    !timedOut && typedAnswer.trim().toLowerCase() === current.back.trim().toLowerCase();

  return (
    <div className="pt-12 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/deck/${deckId}`}
          className="text-sm text-muted hover:text-ink transition-colors focus-ring"
        >
          ← Back to deck
        </Link>
        <p className="font-display text-xs text-muted uppercase tracking-wide">
          {queue.length} card{queue.length !== 1 ? "s" : ""} left
        </p>
      </div>

      {timerSeconds != null && (
        <div className="h-1.5 bg-border rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-rule transition-[width] duration-100 ease-linear"
            style={{ width: `${Math.round(timeLeftFraction * 100)}%` }}
          />
        </div>
      )}

      <h1 className="font-display font-bold text-ink text-xl mb-8">{title}</h1>

      {current.cardType === "multiple_choice" ? (
        <div>
          <div className="bg-card border-2 border-border rounded-lg shadow-sm p-10 flex flex-col items-center justify-center gap-4 min-h-[200px] mb-6">
            {current.frontImage && (
              <ResizableImage src={current.frontImage} alt="Question" className="max-h-40" />
            )}
            <p className="text-xl text-ink font-medium text-center leading-relaxed">
              {current.front}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {shuffledChoices.map((choice, index) => {
              const isSelected = selectedChoice === choice;
              const isCorrectChoice = choice === current.back;
              const showResult = selectedChoice !== null;

              let stateClasses = "border-border hover:border-ink/50";
              if (showResult && isCorrectChoice) {
                stateClasses = "border-green-600 bg-green-600/10 text-green-700";
              } else if (showResult && isSelected && !isCorrectChoice) {
                stateClasses = "border-margin bg-margin/10 text-margin";
              }

              return (
                <button
                  key={`${current.id}-${index}`}
                  onClick={() => handleChoiceSelect(choice)}
                  disabled={selectedChoice !== null}
                  className={`text-left px-4 py-3 rounded-sm text-sm font-medium border-2 transition-colors focus-ring bg-card text-ink ${stateClasses}`}
                >
                  {choice}
                </button>
              );
            })}
          </div>

          {selectedChoice !== null && (
            <div className="text-center">
              <p className={`text-sm font-medium mb-3 ${!timedOut && selectedChoice === current.back ? "text-green-700" : "text-margin"}`}>
                {!timedOut && selectedChoice === current.back
                  ? feedbackMessage
                  : `${feedbackMessage} The answer was "${current.back}".`}
              </p>
              <button
                onClick={handleChoiceContinue}
                className="bg-ink text-paper px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      ) : current.cardType === "identification" ? (
        <div>
          <div className="bg-card border-2 border-border rounded-lg shadow-sm p-10 flex flex-col items-center justify-center gap-4 min-h-[200px] mb-6">
            {current.frontImage && (
              <ResizableImage src={current.frontImage} alt="Question" className="max-h-40" />
            )}
            <p className="text-xl text-ink font-medium text-center leading-relaxed">
              {current.front}
            </p>
          </div>

          {selectedChoice === null ? (
            <div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTypedSubmit();
                }}
                className="flex gap-2 mb-3"
              >
                <input
                  type="text"
                  autoFocus
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  className="flex-1 bg-card border-2 border-border rounded-sm px-4 py-2.5 text-sm text-ink placeholder:text-muted focus-ring"
                />
                <button
                  type="submit"
                  disabled={!typedAnswer.trim()}
                  className="bg-ink text-paper px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring disabled:opacity-50"
                >
                  Submit
                </button>
              </form>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => handleDifficulty("answered")}
                  className="text-xs text-muted hover:text-ink transition-colors focus-ring"
                >
                  Skip, answer later
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className={`text-sm font-medium mb-3 ${isCorrectIdentification ? "text-green-700" : "text-margin"}`}>
                {isCorrectIdentification
                  ? feedbackMessage
                  : `${feedbackMessage} The answer was "${current.back}".`}
              </p>
              <button
                onClick={() => handleDifficulty(isCorrectIdentification ? "easy" : "try")}
                className="bg-ink text-paper px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Flip card */}
          <div
            className="[perspective:1200px] mb-8 cursor-pointer select-none"
            onClick={() => setFlipped(!flipped)}
          >
            <div
              className="relative h-80 transition-transform duration-500 [transform-style:preserve-3d]"
              style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
            >
              <div className="absolute inset-0 bg-card border-2 border-ink rounded-lg shadow-sm p-10 flex flex-col items-center justify-center gap-4 overflow-y-auto [backface-visibility:hidden]">
                {current.frontImage && (
                  <ResizableImage src={current.frontImage} alt="Front" className="max-h-40" />
                )}
                <p className="text-xl text-ink font-medium text-center leading-relaxed">{current.front}</p>
              </div>
              <div
                className="absolute inset-0 bg-card border-2 border-rule rounded-lg shadow-sm p-10 flex flex-col items-center justify-center gap-4 overflow-y-auto [backface-visibility:hidden]"
                style={{ transform: "rotateY(180deg)" }}
              >
                {current.backImage && (
                  <ResizableImage src={current.backImage} alt="Back" className="max-h-40" />
                )}
                <p className="text-xl text-muted text-center leading-relaxed">{current.back}</p>
              </div>
            </div>
          </div>

          {!flipped ? (
            <p className="text-xs text-muted text-center">Click the card to flip it</p>
          ) : (
            <div>
              <p className="text-xs text-muted text-center mb-3">How well did you know it?</p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleDifficulty("try")}
                  className="bg-margin text-paper px-4 py-3 rounded-sm text-sm font-medium hover:opacity-90 transition-opacity focus-ring"
                >
                  Try
                  <span className="block text-[11px] font-normal opacity-80 mt-0.5">show again soon</span>
                </button>
                <button
                  onClick={() => handleDifficulty("easy")}
                  className="bg-ink text-paper px-4 py-3 rounded-sm text-sm font-medium hover:opacity-90 transition-opacity focus-ring"
                >
                  Easy
                  <span className="block text-[11px] font-normal opacity-80 mt-0.5">done for now</span>
                </button>
                <button
                  onClick={() => handleDifficulty("answered")}
                  className="bg-rule text-paper px-4 py-3 rounded-sm text-sm font-medium hover:opacity-90 transition-opacity focus-ring"
                >
                  Answered
                  <span className="block text-[11px] font-normal opacity-80 mt-0.5">show again later</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}