"use client";

import ExpandableField from "@/components/ExpandableField";
import ImageUploadField from "@/components/ImageUploadField";

export type CardInput = {
  front: string;
  back: string;
  frontImage: string | null;
  backImage: string | null;
  frontImageWidth: number | null;
  backImageWidth: number | null;
  cardType: "flashcard" | "multiple_choice" | "identification";
  choices: string[];
};

export function emptyCard(): CardInput {
  return {
    front: "",
    back: "",
    frontImage: null,
    backImage: null,
    frontImageWidth: null,
    backImageWidth: null,
    cardType: "flashcard",
    choices: ["", "", "", ""],
  };
}

export default function CardEditorFields({
  card,
  onChange,
  onRemove,
  removable,
}: {
  card: CardInput;
  onChange: (updated: CardInput) => void;
  onRemove?: () => void;
  removable?: boolean;
}) {
  function updateField(field: "front" | "back", value: string) {
    onChange({ ...card, [field]: value });
  }

  function updateImage(field: "frontImage" | "backImage", url: string | null) {
    if (field === "frontImage") {
      onChange({ ...card, frontImage: url, frontImageWidth: url ? card.frontImageWidth : null });
    } else {
      onChange({ ...card, backImage: url, backImageWidth: url ? card.backImageWidth : null });
    }
  }

  function updateImageWidth(field: "frontImageWidth" | "backImageWidth", width: number) {
    onChange({ ...card, [field]: width });
  }

  function updateType(type: CardInput["cardType"]) {
    onChange({ ...card, cardType: type });
  }

  function updateChoice(index: number, value: string) {
    onChange({
      ...card,
      choices: card.choices.map((ch, i) => (i === index ? value : ch)),
    });
  }

  return (
    <div className="bg-card border border-border rounded-sm p-4 relative">
      <div className="flex gap-2 mb-3">
        {(["flashcard", "multiple_choice", "identification"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => updateType(type)}
            className={`px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors focus-ring ${
              card.cardType === type
                ? "bg-ink text-paper border-ink"
                : "bg-card text-muted border-border hover:border-ink/50"
            }`}
          >
            {type === "flashcard" ? "Flashcard" : type === "multiple_choice" ? "Multiple Choice" : "Type Answer"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <ExpandableField
            label={card.cardType === "flashcard" ? "Front" : "Question"}
            value={card.front}
            onChange={(v) => updateField("front", v)}
            placeholder={card.cardType === "flashcard" ? "Front" : "Question"}
            compact
          />
          <ImageUploadField
            label="Front"
            value={card.frontImage}
            width={card.frontImageWidth}
            onChange={(url) => updateImage("frontImage", url)}
            onWidthChange={(w) => updateImageWidth("frontImageWidth", w)}
          />
        </div>
        <div>
          <ExpandableField
            label={card.cardType === "flashcard" ? "Back" : "Correct Answer"}
            value={card.back}
            onChange={(v) => updateField("back", v)}
            placeholder={card.cardType === "flashcard" ? "Back" : "Correct answer"}
            compact
          />
          <ImageUploadField
            label="Back"
            value={card.backImage}
            width={card.backImageWidth}
            onChange={(url) => updateImage("backImage", url)}
            onWidthChange={(w) => updateImageWidth("backImageWidth", w)}
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
                onChange={(e) => updateChoice(ci, e.target.value)}
                placeholder={`Choice ${ci + 1}`}
                className="w-full bg-paper border-2 border-border rounded-sm px-3 py-2 text-sm text-ink placeholder:text-muted focus-ring"
              />
            ))}
          </div>
        </div>
      )}

      {removable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-3 text-xs text-muted hover:text-margin transition-colors focus-ring"
          aria-label="Remove card"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function isValidCard(c: CardInput): boolean {
  const hasFront = Boolean(c.front.trim() || c.frontImage);
  const hasBack = Boolean(c.back.trim() || c.backImage);
  if (!hasFront || !hasBack) return false;

  if (c.cardType === "multiple_choice") {
    const filled = c.choices.map((ch) => ch.trim()).filter(Boolean);
    const unique = new Set(filled);
    if (filled.length !== 4 || unique.size !== 4) return false;
    // Back text must match a choice, but only when there IS back text.
    // An image-only back skips this check (there's nothing to match).
    if (c.back.trim() && !filled.includes(c.back.trim())) return false;
    return true;
  }

  return true;
}