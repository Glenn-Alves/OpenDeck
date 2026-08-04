"use client";

import { useEffect, useState } from "react";
import ExpandableField from "@/components/ExpandableField";
import ImageUploadField from "@/components/ImageUploadField";
import { emptyCard, type CardInput } from "@/components/CardEditorFields";

export type CardWithLocation = CardInput & {
  id: string;
  locationId: string | null; // null = main deck / top level
};

export type LocationOption = { id: string | null; label: string };

export default function AddCardModal({
  open,
  onClose,
  locations,
  editingCard,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  locations: LocationOption[];
  editingCard: CardWithLocation | null;
  onSave: (card: CardWithLocation) => void;
}) {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [card, setCard] = useState<CardInput>(emptyCard());

  useEffect(() => {
    if (!open) return;
    if (editingCard) {
      setLocationId(editingCard.locationId);
      setCard({
        front: editingCard.front,
        back: editingCard.back,
        frontImage: editingCard.frontImage,
        backImage: editingCard.backImage,
        frontImageWidth: editingCard.frontImageWidth,
        backImageWidth: editingCard.backImageWidth,
        cardType: editingCard.cardType,
        choices: editingCard.choices,
      });
    } else {
      setLocationId(locations[0]?.id ?? null);
      setCard(emptyCard());
    }
  }, [open, editingCard, locations]);

  if (!open) return null;

  const isEditing = Boolean(editingCard);

  function isValid(): boolean {
  const hasFront = Boolean(card.front.trim() || card.frontImage);
  const hasBack = Boolean(card.back.trim() || card.backImage);
  if (!hasFront || !hasBack) return false;

  if (card.cardType === "multiple_choice") {
    const filled = card.choices.map((c) => c.trim()).filter(Boolean);
    const unique = new Set(filled);
    if (filled.length !== 4 || unique.size !== 4) return false;
    if (card.back.trim() && !filled.includes(card.back.trim())) return false;
    return true;
  }
  return true;
}

  function handleSaveAndClose() {
    if (!isValid()) return;
    onSave({
      id: editingCard?.id ?? crypto.randomUUID(),
      locationId,
      ...card,
    });
    onClose();
  }

  function handleAddAndContinue() {
    if (!isValid()) return;
    onSave({
      id: crypto.randomUUID(),
      locationId,
      ...card,
    });
    // Keep the modal open and the same type/location selected, like Anki's
    // Add window, but reset the actual field content for the next card.
    setCard(emptyCard());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border-2 border-border rounded-sm shadow-xl w-full max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="font-display font-bold text-ink text-sm">
            {isEditing ? "Edit card" : "Add card"}
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-margin transition-colors focus-ring text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Type + Location row, mirroring Anki's Type / Deck row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block font-display text-[11px] text-muted uppercase tracking-wide mb-1">
                Type
              </label>
              <div className="flex gap-2">
                {(["flashcard", "multiple_choice", "identification"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCard((c) => ({ ...c, cardType: type }))}
                    className={`px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors focus-ring ${
                      card.cardType === type
                        ? "bg-ink text-paper border-ink"
                        : "bg-paper text-muted border-border hover:border-ink/50"
                    }`}
                  >
                    {type === "flashcard" ? "Flashcard" : type === "multiple_choice" ? "Multiple Choice" : "Type Answer"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="block font-display text-[11px] text-muted uppercase tracking-wide mb-1">
                Location
              </label>
              <select
                value={locationId ?? "__root__"}
                onChange={(e) =>
                  setLocationId(e.target.value === "__root__" ? null : e.target.value)
                }
                className="w-full bg-paper border-2 border-border rounded-sm px-3 py-1.5 text-sm text-ink focus-ring"
              >
                {locations.map((loc) => (
                  <option key={loc.id ?? "__root__"} value={loc.id ?? "__root__"}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Front / Back */}
          <div>
            <label className="block font-display text-[11px] text-muted uppercase tracking-wide mb-1">
              {card.cardType === "flashcard" ? "Front" : "Question"}
            </label>
            <ExpandableField
              label={card.cardType === "flashcard" ? "Front" : "Question"}
              value={card.front}
              onChange={(v) => setCard((c) => ({ ...c, front: v }))}
              placeholder={card.cardType === "flashcard" ? "Front" : "Question"}
            />
            <ImageUploadField
              label="Front"
              value={card.frontImage}
              width={card.frontImageWidth}
              onChange={(url) =>
                setCard((c) => ({ ...c, frontImage: url, frontImageWidth: url ? c.frontImageWidth : null }))
              }
              onWidthChange={(w) => setCard((c) => ({ ...c, frontImageWidth: w }))}
            />
          </div>

          <div>
            <label className="block font-display text-[11px] text-muted uppercase tracking-wide mb-1">
              {card.cardType === "flashcard" ? "Back" : "Correct Answer"}
            </label>
            <ExpandableField
              label={card.cardType === "flashcard" ? "Back" : "Correct Answer"}
              value={card.back}
              onChange={(v) => setCard((c) => ({ ...c, back: v }))}
              placeholder={card.cardType === "flashcard" ? "Back" : "Correct answer"}
            />
            <ImageUploadField
              label="Back"
              value={card.backImage}
              width={card.backImageWidth}
              onChange={(url) =>
                setCard((c) => ({ ...c, backImage: url, backImageWidth: url ? c.backImageWidth : null }))
              }
              onWidthChange={(w) => setCard((c) => ({ ...c, backImageWidth: w }))}
            />
          </div>

          {card.cardType === "multiple_choice" && (
            <div>
              <label className="block font-display text-[11px] text-muted uppercase tracking-wide mb-1">
                Answer choices (one must exactly match the correct answer above)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {card.choices.map((choice, ci) => (
                  <input
                    key={ci}
                    type="text"
                    value={choice}
                    onChange={(e) =>
                      setCard((c) => ({
                        ...c,
                        choices: c.choices.map((ch, i) => (i === ci ? e.target.value : ch)),
                      }))
                    }
                    placeholder={`Choice ${ci + 1}`}
                    className="w-full bg-paper border-2 border-border rounded-sm px-3 py-2 text-sm text-ink placeholder:text-muted focus-ring"
                  />
                ))}
              </div>
            </div>
          )}

          {!isValid() && (card.front || card.back) && (
            <p className="text-xs text-margin">
              {card.cardType === "multiple_choice"
                ? "Fill all 4 choices (no duplicates), with one exactly matching the correct answer."
                : "Fill in both front and back."}
            </p>
          )}
        </div>

       {/* Footer, matching Anki's Add / Close / Help row */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            type="button"
            onClick={isEditing ? handleSaveAndClose : handleAddAndContinue}
            disabled={!isValid()}
            className="bg-ink text-paper px-4 py-2 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring disabled:opacity-40"
          >
            {isEditing ? "Save" : "Add"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-card border border-border text-ink px-4 py-2 rounded-sm text-sm font-medium hover:border-ink transition-colors focus-ring"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              // TODO: link to help/docs once that page exists
            }}
            className="text-sm text-muted hover:text-ink transition-colors focus-ring px-3 py-2"
          >
            Help
          </button>
        </div>
      </div>
    </div>
  );
}