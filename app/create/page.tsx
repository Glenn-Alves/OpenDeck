"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ExpandableField from "@/components/ExpandableField";
import ImageUploadField from "@/components/ImageUploadField";
import AnkiImportGuide from "@/components/AnkiImportGuide";
import { useAuth } from "@/components/AuthProvider";

type CardInput = {
  front: string;
  back: string;
  frontImage: string | null;
  backImage: string | null;
  cardType: "flashcard" | "multiple_choice";
  choices: string[];
};

export default function CreateDeckPage() {
  const supabase = createClient();
  const router = useRouter();
  const { user, loading: checkingAuth } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [cards, setCards] = useState<CardInput[]>([
    { front: "", back: "", frontImage: null, backImage: null, cardType: "flashcard", choices: ["", "", "", ""] },
  ]);

  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedDeckId, setPublishedDeckId] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch("/api/anki/import", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error ?? "Could not import that file.");
      } else if (data.mode === "created") {
        router.push(`/deck/${data.rootDeckId}`);
        return;
      } else {
        setCards(
          data.cards.map(
            (c: {
              front: string;
              back: string;
              frontImage?: string | null;
              backImage?: string | null;
            }) => ({
              front: c.front,
              back: c.back,
              frontImage: c.frontImage ?? null,
              backImage: c.backImage ?? null,
              cardType: "flashcard" as const,
              choices: ["", "", "", ""],
            })
          )
        );
        if (!title.trim()) {
          setTitle(file.name.replace(/\.apkg$/i, ""));
        }
      }
    } catch {
      setImportError("Could not import that file.");
    }

    setImporting(false);
    e.target.value = "";
  }

  function updateCard(index: number, field: "front" | "back", value: string) {
    setCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  function updateCardImage(
    index: number,
    field: "frontImage" | "backImage",
    url: string | null
  ) {
    setCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: url } : c))
    );
  }

  function addCard() {
    setCards((prev) => [
      ...prev,
      { front: "", back: "", frontImage: null, backImage: null, cardType: "flashcard", choices: ["", "", "", ""] },
    ]);
  }

  function updateCardType(index: number, type: CardInput["cardType"]) {
    setCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, cardType: type } : c))
    );
  }

  function updateChoice(index: number, choiceIndex: number, value: string) {
    setCards((prev) =>
      prev.map((c, i) =>
        i === index
          ? { ...c, choices: c.choices.map((ch, ci) => (ci === choiceIndex ? value : ch)) }
          : c
      )
    );
  }

  function removeCard(index: number) {
    setCards((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("You need to be logged in to publish a deck.");
      return;
    }
    if (!title.trim()) {
      setError("Give your deck a title.");
      return;
    }

    const validCards = cards.filter((c) => {
  if (!c.front.trim() || !c.back.trim()) return false;
  if (c.cardType === "multiple_choice") {
    const filledChoices = c.choices.map((ch) => ch.trim()).filter(Boolean);
    const uniqueChoices = new Set(filledChoices);
    return (
      filledChoices.length === 4 &&
      uniqueChoices.size === 4 &&
      filledChoices.includes(c.back.trim())
    );
  }
  return true;
});
    if (validCards.length === 0) {
      setError(
        "Add at least one valid card. Multiple choice cards need all 4 choices filled, with one exactly matching the correct answer."
      );
      return;
    }

    setSubmitting(true);

    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // 1. Insert the deck
    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .insert({
        owner_id: user.id,
        title: title.trim(),
        description: description.trim(),
        tags: tagList,
        difficulty,
        visibility: "public",
      })
      .select()
      .single();

    if (deckError || !deck) {
      setSubmitting(false);
      setError(deckError?.message ?? "Could not create the deck.");
      return;
    }

    // 2. Insert the cards, linked to that deck
    const { error: cardsError } = await supabase.from("cards").insert(
      validCards.map((c) => ({
        deck_id: deck.id,
        front_text: c.front.trim(),
        back_text: c.back.trim(),
        front_image_url: c.frontImage,
        back_image_url: c.backImage,
        card_type: c.cardType,
        choices: c.cardType === "multiple_choice" ? c.choices.map((ch) => ch.trim()) : null,
      }))
    );

    setSubmitting(false);

    if (cardsError) {
      setError(
        `Deck was created, but cards failed to save: ${cardsError.message}`
      );
      return;
    }

    setPublishedDeckId(deck.id);
  }

  if (checkingAuth) {
    return <div className="pt-16 text-sm text-muted">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="pt-16 max-w-md">
        <p className="font-display text-xs text-margin uppercase tracking-widest mb-3">
          new deck
        </p>
        <h1 className="font-display font-bold text-ink text-2xl mb-4">
          Log in to publish a deck
        </h1>
        <p className="text-muted text-sm mb-6">
          You need an account so decks are tied to you and you can edit them
          later.
        </p>
        <Link
          href="/login"
          className="inline-block bg-ink text-paper px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring"
        >
          Go to login
        </Link>
      </div>
    );
  }

  if (publishedDeckId) {
    return (
      <div className="pt-16 max-w-md">
        <p className="font-display text-xs text-margin uppercase tracking-widest mb-3">
          published
        </p>
        <h1 className="font-display font-bold text-ink text-2xl mb-4">
          Deck saved
        </h1>
        <p className="text-muted text-sm mb-2">
          Your deck is now stored in the database. The browse page still
          shows sample decks for now — that's the next thing to wire up so
          real decks show there too.
        </p>
        <p className="text-xs text-muted mb-6">
          Deck ID: <code className="text-ink">{publishedDeckId}</code>
        </p>
        <button
          onClick={() => {
            setPublishedDeckId(null);
            setTitle("");
            setDescription("");
            setTags("");
            setDifficulty("Medium");
            setCards([{ front: "", back: "", frontImage: null, backImage: null, cardType: "flashcard", choices: ["", "", "", ""] }]);
          }}
          className="text-sm text-rule hover:text-ink transition-colors focus-ring"
        >
          Create another deck
        </button>
      </div>
    );
  }

  return (
    <div className="pt-12 max-w-2xl">
      <p className="font-display text-xs text-margin uppercase tracking-widest mb-3">
        new deck
      </p>
      <h1 className="font-display font-bold text-ink text-2xl md:text-3xl mb-8">
        Publish a deck
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-display text-xs text-ink uppercase tracking-wide mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The Count of Monte Cristo"
            className="w-full bg-card border-2 border-border rounded-sm px-4 py-3 text-sm text-ink placeholder:text-muted focus-ring"
          />
        </div>

        <div>
          <label className="block font-display text-xs text-ink uppercase tracking-wide mb-2">
            Description
          </label>
          <ExpandableField
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="What's in this deck and who is it for?"
          />
        </div>

        <div>
          <label className="block font-display text-xs text-ink uppercase tracking-wide mb-2">
            Tags
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="historical, classic, literature"
            className="w-full bg-card border-2 border-border rounded-sm px-4 py-3 text-sm text-ink placeholder:text-muted focus-ring"
          />
          <p className="text-xs text-muted mt-1.5">Separate tags with commas.</p>
        </div>

        <div>
          <label className="block font-display text-xs text-ink uppercase tracking-wide mb-2">
            Difficulty
          </label>
          <div className="flex gap-2">
            {(["Easy", "Medium", "Hard"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setDifficulty(level)}
                className={`px-4 py-2 rounded-sm text-sm font-medium border-2 transition-colors focus-ring ${
                  difficulty === level
                    ? "bg-ink text-paper border-ink"
                    : "bg-card text-muted border-border hover:border-ink/50"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="border-2 border-dashed border-border rounded-sm p-6 text-center">
          <p className="text-sm text-ink font-medium mb-1">
            Import cards from Anki
          </p>
          <p className="text-xs text-muted mb-4">
            Upload a .apkg file exported from Anki. A simple deck fills in
            the cards below to review before publishing. A deck with
            subsections gets created and organized automatically.
          </p>
          <div className="text-left mb-4">
            <AnkiImportGuide />
          </div>
          <input
            type="file"
            accept=".apkg"
            onChange={handleImportFile}
            disabled={importing}
            className="text-sm text-ink mx-auto"
          />
          {importing && (
            <p className="text-xs text-muted mt-2">Reading file...</p>
          )}
          {importError && (
            <p className="text-xs text-margin mt-2">{importError}</p>
          )}
        </div>

        <div>
          <label className="block font-display text-xs text-ink uppercase tracking-wide mb-2">
            Cards
          </label>
          <div className="space-y-3">
            {cards.map((card, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-sm p-4 relative"
              >
                <div className="flex gap-2 mb-3">
                  {(["flashcard", "multiple_choice"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateCardType(i, type)}
                      className={`px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors focus-ring ${
                        card.cardType === type
                          ? "bg-ink text-paper border-ink"
                          : "bg-card text-muted border-border hover:border-ink/50"
                      }`}
                    >
                      {type === "flashcard" ? "Flashcard" : "Multiple Choice"}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <ExpandableField
                      label={card.cardType === "flashcard" ? "Front" : "Question"}
                      value={card.front}
                      onChange={(v) => updateCard(i, "front", v)}
                      placeholder={card.cardType === "flashcard" ? "Front" : "Question"}
                      compact
                    />
                    <ImageUploadField
                      label="Front"
                      value={card.frontImage}
                      onChange={(url) => updateCardImage(i, "frontImage", url)}
                    />
                  </div>
                  <div>
                    <ExpandableField
                      label={card.cardType === "flashcard" ? "Back" : "Correct Answer"}
                      value={card.back}
                      onChange={(v) => updateCard(i, "back", v)}
                      placeholder={card.cardType === "flashcard" ? "Back" : "Correct answer"}
                      compact
                    />
                    <ImageUploadField
                      label="Back"
                      value={card.backImage}
                      onChange={(url) => updateCardImage(i, "backImage", url)}
                    />
                  </div>
                </div>

                {card.cardType === "multiple_choice" && (
                  <div className="mt-3">
                    <label className="block font-display text-xs text-ink uppercase tracking-wide mb-2">
                      Answer choices (one must exactly match the correct answer above)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {card.choices.map((choice, ci) => (
                        <input
                          key={ci}
                          type="text"
                          value={choice}
                          onChange={(e) => updateChoice(i, ci, e.target.value)}
                          placeholder={`Choice ${ci + 1}`}
                          className="w-full bg-paper border-2 border-border rounded-sm px-3 py-2 text-sm text-ink placeholder:text-muted focus-ring"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {cards.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCard(i)}
                    className="absolute top-2 right-3 text-xs text-muted hover:text-margin transition-colors focus-ring"
                    aria-label="Remove card"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addCard}
            className="text-sm text-rule hover:text-ink transition-colors focus-ring mt-3"
          >
            + Add another card
          </button>
        </div>

        {error && (
          <p className="text-sm text-margin border border-margin/30 bg-margin/5 rounded-sm px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="bg-ink text-paper px-6 py-3 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring disabled:opacity-50"
          >
            {submitting ? "Publishing..." : "Publish deck"}
          </button>
        </div>
      </form>
    </div>
  );
}