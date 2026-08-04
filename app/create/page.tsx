"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AnkiImportGuide from "@/components/AnkiImportGuide";
import AddCardModal, { type CardWithLocation, type LocationOption } from "@/components/AddCardModal";
import { isValidCard } from "@/components/CardEditorFields";
import SubsectionBuilder, {
  emptySubsectionNode,
  buildLocationPaths,
  type SubsectionNode,
} from "@/components/SubsectionBuilder";
import { useAuth } from "@/components/AuthProvider";

export default function CreateDeckPage() {
  const supabase = createClient();
  const router = useRouter();
  const { user, loading: checkingAuth } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [subsections, setSubsections] = useState<SubsectionNode[]>([]);
  const [cards, setCards] = useState<CardWithLocation[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardWithLocation | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedDeckId, setPublishedDeckId] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const locations: LocationOption[] = [
    { id: null, label: "Main deck (top level)" },
    ...buildLocationPaths(subsections),
  ];

  function locationLabel(id: string | null): string {
    return locations.find((l) => l.id === id)?.label ?? "Main deck (top level)";
  }

  async function processImportFile(file: File) {
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
              id: crypto.randomUUID(),
              locationId: null,
              front: c.front,
              back: c.back,
              frontImage: c.frontImage ?? null,
              backImage: c.backImage ?? null,
              frontImageWidth: null,
              backImageWidth: null,
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
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processImportFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".apkg")) {
      setImportError("Please drop a .apkg file exported from Anki.");
      return;
    }
    processImportFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
  }

  function openAddModal() {
    setEditingCard(null);
    setModalOpen(true);
  }

  function openEditModal(card: CardWithLocation) {
    setEditingCard(card);
    setModalOpen(true);
  }

  function handleSaveCard(card: CardWithLocation) {
    setCards((prev) => {
      const exists = prev.some((c) => c.id === card.id);
      return exists ? prev.map((c) => (c.id === card.id ? card : c)) : [...prev, card];
    });
  }

  function removeCard(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  async function insertSubsectionTree(
    nodes: SubsectionNode[],
    parentDeckId: string,
    ownerId: string,
    idMap: Map<string, string>
  ) {
    for (const node of nodes) {
      if (!node.title.trim()) continue;

      const { data: sub, error: subError } = await supabase
        .from("decks")
        .insert({
          owner_id: ownerId,
          parent_deck_id: parentDeckId,
          title: node.title.trim(),
          description: "",
          tags: [],
          visibility: "public",
        })
        .select()
        .single();

      if (!sub || subError) continue;

      idMap.set(node.id, sub.id);
      await insertSubsectionTree(node.children, sub.id, ownerId, idMap);
    }
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

    const validCards = cards.filter(isValidCard);
    if (validCards.length === 0) {
      setError(
        "Add at least one valid card. Every card needs text or an image on both sides. Multiple choice cards need all 4 choices filled, with one exactly matching the correct answer (if it has text)."
      );
      return;
    }

    setSubmitting(true);

    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // 1. Insert the root deck
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

    // 2. Insert the whole subsection tree, tracking builder-id -> real-db-id
    const idMap = new Map<string, string>();
    if (subsections.length > 0) {
      await insertSubsectionTree(subsections, deck.id, user.id, idMap);
    }

    // 3. Insert every card, routed to the deck.id or the matching subsection's real id
    const { error: cardsError } = await supabase.from("cards").insert(
      validCards.map((c) => ({
        deck_id: c.locationId ? idMap.get(c.locationId) ?? deck.id : deck.id,
        front_text: c.front.trim(),
        back_text: c.back.trim(),
        front_image_url: c.frontImage,
        back_image_url: c.backImage,
        front_image_width: c.frontImageWidth,
        back_image_width: c.backImageWidth,
        card_type: c.cardType,
        choices: c.cardType === "multiple_choice" ? c.choices.map((ch) => ch.trim()) : null,
      }))
    );

    setSubmitting(false);

    if (cardsError) {
      setError(`Deck was created, but cards failed to save: ${cardsError.message}`);
      return;
    }

    setPublishedDeckId(deck.id);
  }

  function resetForm() {
    setPublishedDeckId(null);
    setTitle("");
    setDescription("");
    setTags("");
    setDifficulty("Medium");
    setSubsections([]);
    setCards([]);
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
        <p className="text-xs text-muted mb-6">
          Deck ID: <code className="text-ink">{publishedDeckId}</code>
        </p>
        <div className="flex gap-3">
          <Link
            href={`/deck/${publishedDeckId}`}
            className="bg-ink text-paper px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring"
          >
            View deck
          </Link>
          <button
            onClick={resetForm}
            className="text-sm text-rule hover:text-ink transition-colors focus-ring"
          >
            Create another deck
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-12">
      <p className="font-display text-xs text-margin uppercase tracking-widest mb-3">
        new deck
      </p>
      <h1 className="font-display font-bold text-ink text-2xl md:text-3xl mb-8">
        Publish a deck
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Main form */}
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
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

          {/* Subsections — now above Cards */}
          <div>
            <label className="block font-display text-xs text-ink uppercase tracking-wide mb-2">
              Subsections{" "}
              <span className="text-muted normal-case">(optional — create the structure first)</span>
            </label>
            <SubsectionBuilder nodes={subsections} onChange={setSubsections} />
          </div>

          {/* Cards — now just a compact list + floating Add button */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block font-display text-xs text-ink uppercase tracking-wide">
                Cards ({cards.length})
              </label>
              <button
                type="button"
                onClick={openAddModal}
                className="bg-ink text-paper px-3 py-1.5 rounded-sm text-xs font-medium hover:bg-margin transition-colors focus-ring"
              >
                + Add card
              </button>
            </div>

            {cards.length === 0 ? (
              <p className="text-xs text-muted">
                No cards yet. Click &ldquo;+ Add card&rdquo; to open the card editor.
              </p>
            ) : (
              <div className="space-y-1.5">
                {cards.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 bg-card border border-border rounded-sm px-3 py-2"
                  >
                    <span className="text-[10px] uppercase tracking-wide text-muted border border-border rounded-full px-1.5 py-0.5 shrink-0">
                      {c.cardType === "flashcard" ? "Card" : "MCQ"}
                    </span>
                    <span className="text-sm text-ink truncate flex-1">
                      {c.front.trim() || (c.frontImage ? "(image)" : "(empty)")}
                    </span>
                    <span className="text-[11px] text-muted shrink-0 hidden sm:inline">
                      {locationLabel(c.locationId)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditModal(c)}
                      className="text-xs text-rule hover:text-ink transition-colors focus-ring shrink-0"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCard(c.id)}
                      className="text-xs text-muted hover:text-margin transition-colors focus-ring shrink-0"
                      aria-label="Remove card"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block font-display text-xs text-ink uppercase tracking-wide mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's in this deck and who is it for?"
              rows={3}
              className="w-full bg-card border-2 border-border rounded-sm px-4 py-3 text-sm text-ink placeholder:text-muted focus-ring"
            />
          </div>

          {error && (
            <p className="text-sm text-margin border border-margin/30 bg-margin/5 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-ink text-paper px-6 py-3 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring disabled:opacity-50"
            >
              {submitting ? "Publishing..." : "Publish deck"}
            </button>
          </div>
        </form>

        {/* Anki import — sidebar */}
        <div className="lg:sticky lg:top-6 self-start">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-sm p-6 text-center transition-colors ${
              dragActive ? "border-rule bg-rule/5" : "border-border"
            }`}
          >
            <p className="text-sm text-ink font-medium mb-1">
              Import from Anki
            </p>
            <p className="text-xs text-muted mb-4">
              Drag a .apkg file here, or choose one below. A deck with
              subdecks gets created and organized automatically.
            </p>
            <div className="text-left mb-4">
              <AnkiImportGuide />
            </div>
            <input
              type="file"
              accept=".apkg"
              onChange={handleImportFile}
              disabled={importing}
              className="text-xs text-ink w-full"
            />
            {importing && (
              <p className="text-xs text-muted mt-2">Reading file...</p>
            )}
            {importError && (
              <p className="text-xs text-margin mt-2">{importError}</p>
            )}
          </div>
        </div>
      </div>

      <AddCardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        locations={locations}
        editingCard={editingCard}
        onSave={handleSaveCard}
      />
    </div>
  );
}