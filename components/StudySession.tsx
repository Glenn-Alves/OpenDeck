"use client";

import { useState } from "react";
import StudySetup from "@/components/StudySetup";
import StudyMode from "@/components/StudyMode";
import type { StudyCard } from "@/lib/getDeckForStudy";

export default function StudySession({
  deckId,
  title,
  cards,
}: {
  deckId: string;
  title: string;
  cards: StudyCard[];
}) {
  const [session, setSession] = useState<{ cards: StudyCard[]; timerSeconds: number | null } | null>(
    null
  );

  // No cards at all — skip setup, StudyMode already shows its own
  // "this deck has no cards yet" message.
  if (cards.length === 0) {
    return <StudyMode deckId={deckId} title={title} cards={cards} timerSeconds={null} />;
  }

  if (!session) {
    return (
      <StudySetup
        title={title}
        cards={cards}
        onStart={(selectedCards, timerSeconds) => setSession({ cards: selectedCards, timerSeconds })}
      />
    );
  }

  return (
    <StudyMode
      deckId={deckId}
      title={title}
      cards={session.cards}
      timerSeconds={session.timerSeconds}
    />
  );
}