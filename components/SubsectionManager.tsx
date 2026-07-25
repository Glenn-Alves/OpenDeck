"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Subsection = { id: string; title: string };

export default function SubsectionManager({
  parentDeckId,
  subsections,
  isOwner,
}: {
  parentDeckId: string;
  subsections: Subsection[];
  isOwner: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!title.trim()) {
      setError("Give the subsection a title.");
      return;
    }
    setSaving(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setSaving(false);
      setError("You need to be logged in.");
      return;
    }

    const { error } = await supabase.from("decks").insert({
      owner_id: user.id,
      parent_deck_id: parentDeckId,
      title: title.trim(),
      description: "",
      tags: [],
      visibility: "public",
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setTitle("");
    setAdding(false);
    router.refresh();
  }

  if (subsections.length === 0 && !isOwner) return null;

  return (
    <section className="mb-12">
      <h2 className="font-display font-bold text-ink text-sm uppercase tracking-wide mb-4">
        Subsections
      </h2>

      {subsections.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {subsections.map((s) => (
            <Link
              key={s.id}
              href={`/deck/${s.id}`}
              className="bg-card border border-ink/10 rounded-sm px-4 py-3 text-sm text-ink hover:border-ink transition-colors focus-ring"
            >
              📁 {s.title}
            </Link>
          ))}
        </div>
      ) : (
        isOwner && (
          <p className="text-sm text-muted mb-4">
            Use these to group related decks together, like folders.
          </p>
        )
      )}

      {isOwner && (
        <>
          {adding ? (
            <div className="bg-card border-2 border-ink rounded-sm p-4 max-w-md">
              <label className="block font-display text-xs text-ink uppercase tracking-wide mb-2">
                Subsection title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 1"
                className="w-full bg-paper border-2 border-ink rounded-sm px-3 py-2 text-sm text-ink placeholder:text-muted focus-ring mb-2"
              />
              {error && <p className="text-xs text-margin mb-2">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="bg-ink text-paper px-3 py-1.5 rounded-sm text-xs font-medium hover:bg-margin transition-colors focus-ring disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Add"}
                </button>
                <button
                  onClick={() => {
                    setAdding(false);
                    setTitle("");
                    setError(null);
                  }}
                  className="text-xs text-muted hover:text-ink transition-colors focus-ring"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="text-sm text-rule hover:text-ink transition-colors focus-ring"
            >
              + Add subsection
            </button>
          )}
        </>
      )}
    </section>
  );
}