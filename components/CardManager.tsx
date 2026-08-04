"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ExpandableField from "./ExpandableField";
import ImageUploadField from "./ImageUploadField";

type Row = {
  id: string | null; // null = not yet saved
  front: string;
  back: string;
  frontImage: string | null;
  backImage: string | null;
  frontImageWidth: number | null;
  backImageWidth: number | null;
  cardType: "flashcard" | "multiple_choice" | "identification";
  choices: string[];
  saving: boolean;
  error: string | null;
};

export default function CardManager({
  deckId,
  initialCards,
}: {
  deckId: string;
  initialCards: {
    id: string;
    front: string;
    back: string;
    frontImage: string | null;
    backImage: string | null;
    frontImageWidth?: number | null;
    backImageWidth?: number | null;
    cardType?: "flashcard" | "multiple_choice" | "identification";
    choices?: string[] | null;
  }[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>(
    initialCards.map((c) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      frontImage: c.frontImage,
      backImage: c.backImage,
      frontImageWidth: c.frontImageWidth ?? null,
      backImageWidth: c.backImageWidth ?? null,
      cardType: c.cardType ?? "flashcard",
      choices: c.choices && c.choices.length === 4 ? c.choices : ["", "", "", ""],
      saving: false,
      error: null,
    }))
  );

  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);

  function updateRow(index: number, field: "front" | "back", value: string) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function updateRowImage(
    index: number,
    field: "frontImage" | "backImage",
    url: string | null
  ) {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        if (field === "frontImage") {
          return { ...r, frontImage: url, frontImageWidth: url ? r.frontImageWidth : null };
        }
        return { ...r, backImage: url, backImageWidth: url ? r.backImageWidth : null };
      })
    );
  }

  function updateRowImageWidth(
    index: number,
    field: "frontImageWidth" | "backImageWidth",
    width: number
  ) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: width } : r))
    );
  }

  function updateRowType(index: number, type: Row["cardType"]) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, cardType: type } : r))
    );
  }

  function updateRowChoice(index: number, choiceIndex: number, value: string) {
    setRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, choices: r.choices.map((ch, ci) => (ci === choiceIndex ? value : ch)) }
          : r
      )
    );
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        id: null,
        front: "",
        back: "",
        frontImage: null,
        backImage: null,
        frontImageWidth: null,
        backImageWidth: null,
        cardType: "flashcard",
        choices: ["", "", "", ""],
        saving: false,
        error: null,
      },
    ]);
  }

  async function saveRow(index: number) {
  const row = rows[index];
  const hasFront = Boolean(row.front.trim() || row.frontImage);
  const hasBack = Boolean(row.back.trim() || row.backImage);

  if (!hasFront || !hasBack) {
    setRows((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, error: "Both front and back need text or an image." } : r
      )
    );
    return;
  }

  if (row.cardType === "multiple_choice") {
    const filledChoices = row.choices.map((ch) => ch.trim()).filter(Boolean);
    const uniqueChoices = new Set(filledChoices);
    const backHasText = Boolean(row.back.trim());
    const hasMatch = !backHasText || row.choices.some((ch) => ch.trim() === row.back.trim());
    if (filledChoices.length !== 4 || uniqueChoices.size !== 4 || !hasMatch) {
      setRows((prev) =>
        prev.map((r, i) =>
          i === index
            ? {
                ...r,
                error:
                  "Multiple choice cards need all 4 choices filled (no duplicates), and if the answer has text, one choice must match it exactly.",
              }
            : r
        )
      );
      return;
    }
  }

  // ...rest of saveRow unchanged from here (setRows saving:true, payload, insert/update)

    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, saving: true, error: null } : r))
    );

    const payload = {
      front_text: row.front.trim(),
      back_text: row.back.trim(),
      front_image_url: row.frontImage,
      back_image_url: row.backImage,
      front_image_width: row.frontImageWidth,
      back_image_width: row.backImageWidth,
      card_type: row.cardType,
      choices: row.cardType === "multiple_choice" ? row.choices.map((ch) => ch.trim()) : null,
    };

    if (row.id) {
      const { error } = await supabase
        .from("cards")
        .update(payload)
        .eq("id", row.id);

      setRows((prev) =>
        prev.map((r, i) =>
          i === index ? { ...r, saving: false, error: error?.message ?? null } : r
        )
      );
    } else {
      const { data, error } = await supabase
        .from("cards")
        .insert({ deck_id: deckId, ...payload })
        .select()
        .single();

      setRows((prev) =>
        prev.map((r, i) =>
          i === index
            ? { ...r, id: data?.id ?? null, saving: false, error: error?.message ?? null }
            : r
        )
      );
    }

    router.refresh();
  }

  function requestDelete(index: number) {
    const row = rows[index];
    if (!row.id) {
      // Never-saved row, just remove it locally, no confirmation needed.
      setRows((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setPendingDeleteIndex(index);
  }

  async function confirmDelete() {
    if (pendingDeleteIndex === null) return;
    const row = rows[pendingDeleteIndex];

    if (row.id) {
      await supabase.from("cards").delete().eq("id", row.id);
      router.refresh();
    }

    setRows((prev) => prev.filter((_, i) => i !== pendingDeleteIndex));
    setPendingDeleteIndex(null);
  }

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div
          key={row.id ?? `new-${i}`}
          className="bg-card border border-border rounded-sm p-4 relative"
        >
          <div className="flex gap-2 mb-3">
           {(["flashcard", "multiple_choice", "identification"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateRowType(i, type)}
                className={`px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors focus-ring ${
                  row.cardType === type
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
                label={row.cardType === "flashcard" ? "Front" : "Question"}
                value={row.front}
                onChange={(v) => updateRow(i, "front", v)}
                placeholder={row.cardType === "flashcard" ? "Front" : "Question"}
                compact
              />
              <ImageUploadField
                label="Front"
                value={row.frontImage}
                width={row.frontImageWidth}
                onChange={(url) => updateRowImage(i, "frontImage", url)}
                onWidthChange={(w) => updateRowImageWidth(i, "frontImageWidth", w)}
              />
            </div>
            <div>
              <ExpandableField
                label={row.cardType === "flashcard" ? "Back" : "Correct Answer"}
                value={row.back}
                onChange={(v) => updateRow(i, "back", v)}
                placeholder={row.cardType === "flashcard" ? "Back" : "Correct answer"}
                compact
              />
              <ImageUploadField
                label="Back"
                value={row.backImage}
                width={row.backImageWidth}
                onChange={(url) => updateRowImage(i, "backImage", url)}
                onWidthChange={(w) => updateRowImageWidth(i, "backImageWidth", w)}
              />
            </div>
          </div>

          {row.cardType === "multiple_choice" && (
            <div className="mt-3">
              <label className="block font-display text-xs text-ink uppercase tracking-wide mb-2">
                Answer choices (one must exactly match the correct answer above)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {row.choices.map((choice, ci) => (
                  <input
                    key={ci}
                    type="text"
                    value={choice}
                    onChange={(e) => updateRowChoice(i, ci, e.target.value)}
                    placeholder={`Choice ${ci + 1}`}
                    className="w-full bg-paper border-2 border-border rounded-sm px-3 py-2 text-sm text-ink placeholder:text-muted focus-ring"
                  />
                ))}
              </div>
            </div>
          )}

          {row.error && (
            <p className="mt-2 text-xs text-margin">{row.error}</p>
          )}

          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => saveRow(i)}
              disabled={row.saving}
              className="bg-ink text-paper px-3 py-1.5 rounded-sm text-xs font-medium hover:bg-margin transition-colors focus-ring disabled:opacity-50"
            >
              {row.saving ? "Saving..." : row.id ? "Save changes" : "Add card"}
            </button>
            <button
              type="button"
              onClick={() => requestDelete(i)}
              className="text-xs text-muted hover:text-margin transition-colors focus-ring"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="text-sm text-rule hover:text-ink transition-colors focus-ring"
      >
        + Add another card
      </button>

      {pendingDeleteIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setPendingDeleteIndex(null)}
        >
          <div
            className="bg-card border-2 border-border rounded-sm shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display font-bold text-ink text-sm mb-2">Delete this card?</p>
            <p className="text-sm text-muted mb-5">This can&apos;t be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteIndex(null)}
                className="border border-border text-ink px-4 py-2 rounded-sm text-sm font-medium hover:border-ink transition-colors focus-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="bg-margin text-paper px-4 py-2 rounded-sm text-sm font-medium hover:opacity-90 transition-colors focus-ring"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}