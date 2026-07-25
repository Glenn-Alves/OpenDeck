"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteDeckButton({
  deckId,
  redirectTo,
}: {
  deckId: string;
  redirectTo: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  async function handleDelete() {
    setConfirmOpen(false);
    setConfirmText("");
    setDeleting(true);
    setError(null);

    const { error } = await supabase.from("decks").delete().eq("id", deckId);

    if (error) {
      setDeleting(false);
      setError(error.message);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  function closeModal() {
    setConfirmOpen(false);
    setConfirmText("");
  }

  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  return (
    <div>
      <button
        onClick={() => setConfirmOpen(true)}
        disabled={deleting}
        className="bg-margin text-paper px-5 py-2.5 rounded-sm text-sm font-medium hover:opacity-90 transition-opacity focus-ring disabled:opacity-50"
      >
        {deleting ? "Deleting..." : "Delete deck"}
      </button>
      {error && <p className="text-xs text-margin mt-2">{error}</p>}

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-card border-2 border-border rounded-sm shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display font-bold text-ink text-lg mb-2">
              Delete this deck?
            </p>
            <p className="text-sm text-muted mb-4">
              This also deletes its cards, comments, ratings, and any
              subsections inside it. This can&rsquo;t be undone.
            </p>
            <label className="block text-xs text-muted mb-1.5">
              Type <span className="font-bold text-ink">DELETE</span> to confirm
            </label>
            <input
              autoFocus
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-paper border-2 border-border rounded-sm px-4 py-2.5 text-sm text-ink placeholder:text-muted focus-ring mb-6"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="text-sm text-muted hover:text-ink transition-colors focus-ring px-4 py-2 rounded-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete}
                className="bg-margin text-paper px-4 py-2 rounded-sm text-sm font-medium hover:opacity-90 transition-opacity focus-ring disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Delete deck
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}