"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { StudyCard } from "@/lib/getDeckForStudy";


function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Difficulty = "try" | "answered" | "easy";

export default function StudyMode({
  deckId,
  title,
  cards,
}: {
  deckId: string;
  title: string;
  cards: StudyCard[];
}) {
  const [queue, setQueue] = useState<StudyCard[]>(cards);
  const [flipped, setFlipped] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");

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
  ];

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

  const finished = queue.length === 0;
  const current = !finished ? queue[0] : null;

  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);

  useEffect(() => {
    if (current && current.cardType === "multiple_choice" && current.choices) {
      setShuffledChoices(shuffle(current.choices));
    } else {
      setShuffledChoices([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  function handleDifficulty(level: Difficulty) {
    const [current, ...rest] = queue;

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
  }

  function handleChoiceSelect(choice: string) {
    if (selectedChoice) return; // already answered, ignore further clicks
    setSelectedChoice(choice);

    const isCorrect = current && choice === current.back;
    const pool = isCorrect ? CORRECT_MESSAGES : INCORRECT_MESSAGES;
    setFeedbackMessage(pool[Math.floor(Math.random() * pool.length)]);
  }

  function handleChoiceContinue() {
    if (!current) return;
    const correct = selectedChoice === current.back;
    handleDifficulty(correct ? "easy" : "try");
  }

  function restart(shuffled: boolean) {
    setQueue(shuffled ? shuffle(cards) : cards);
    setFlipped(false);
    setSelectedChoice(null);
    setFeedbackMessage("");
  }

  if (finished) {
    return (
      <div className="pt-16 max-w-md">
        <p className="font-display text-xs text-margin uppercase tracking-widest mb-3">
          nice work
        </p>
        <h1 className="font-display font-bold text-ink text-2xl mb-6">
          You finished {title}
        </h1>
        <div className="flex gap-3">
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

  return (
    <div className="pt-12 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
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

      <h1 className="font-display font-bold text-ink text-xl mb-8">{title}</h1>

      {current.cardType === "multiple_choice" ? (
        <div>
          <div className="bg-card border-2 border-border rounded-lg shadow-sm p-10 flex flex-col items-center justify-center gap-4 min-h-[200px] mb-6">
            {current.frontImage && (
              <img src={current.frontImage} alt="Question" className="max-h-40 rounded-sm" />
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
              <p className={`text-sm font-medium mb-3 ${selectedChoice === current.back ? "text-green-700" : "text-margin"}`}>
                {selectedChoice === current.back
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
                  <img src={current.frontImage} alt="Front" className="max-h-40 rounded-sm" />
                )}
                <p className="text-xl text-ink font-medium text-center leading-relaxed">{current.front}</p>
              </div>
              <div
                className="absolute inset-0 bg-card border-2 border-rule rounded-lg shadow-sm p-10 flex flex-col items-center justify-center gap-4 overflow-y-auto [backface-visibility:hidden]"
                style={{ transform: "rotateY(180deg)" }}
              >
                {current.backImage && (
                  <img src={current.backImage} alt="Back" className="max-h-40 rounded-sm" />
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