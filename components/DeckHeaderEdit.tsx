"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ExpandableField from "./ExpandableField";

export default function DeckHeaderEdit({
  deckId,
  initialTitle,
  initialDescription,
  initialTags,
  isOwner,
}: {
  deckId: string;
  initialTitle: string;
  initialDescription: string;
  initialTags: string[];
  isOwner: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [tagsInput, setTagsInput] = useState(initialTags.join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) {
      setError("Title can't be empty.");
      return;
    }
    setSaving(true);
    setError(null);

    const tagList = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("decks")
      .update({
        title: title.trim(),
        description: description.trim(),
        tags: tagList,
      })
      .eq("id", deckId);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setEditing(false);
    router.refresh();
  }

  function handleCancel() {
    setTitle(initialTitle);
    setDescription(initialDescription);
    setTagsInput(initialTags.join(", "));
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="mb-3">
        <div className="flex items-start gap-2">
          <h1 className="font-display font-bold text-ink text-2xl md:text-3xl">
            {title}
          </h1>
          {isOwner && (
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit deck title, description, and tags"
              className="text-muted hover:text-ink transition-colors focus-ring mt-1"
            >
              ✎
            </button>
          )}
        </div>
        <p className="text-muted max-w-2xl mt-2">{description}</p>
      </div>
    );
  }

  return (
    <div className="mb-3 max-w-2xl">
      <label className="block font-display text-xs text-ink uppercase tracking-wide mb-2">
        Title
      </label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-card border-2 border-border rounded-sm px-4 py-2.5 text-sm text-ink focus-ring mb-4"
      />

      <label className="block font-display text-xs text-ink uppercase tracking-wide mb-2">
        Description
      </label>
      <ExpandableField
        label="Description"
        value={description}
        onChange={setDescription}
        placeholder="What's in this deck and who is it for?"
      />

      <label className="block font-display text-xs text-ink uppercase tracking-wide mb-2 mt-4">
        Tags
      </label>
      <input
        type="text"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="historical, classic, literature"
        className="w-full bg-card border-2 border-border rounded-sm px-4 py-2.5 text-sm text-ink placeholder:text-muted focus-ring"
      />
      <p className="text-xs text-muted mt-1.5">Separate tags with commas.</p>

      {error && <p className="text-xs text-margin mt-2">{error}</p>}

      <div className="flex gap-3 mt-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-ink text-paper px-4 py-2 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={handleCancel}
          className="text-sm text-muted hover:text-ink transition-colors focus-ring"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}