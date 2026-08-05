"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MarkDeckViewed({
  deckId,
  tags,
}: {
  deckId: string;
  tags: string[];
}) {
  useEffect(() => {
    const encoded = encodeURIComponent(JSON.stringify(tags ?? []));
    document.cookie = `recentDeckTags=${encoded}; path=/; max-age=${60 * 60 * 24 * 365}`;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;

      supabase
        .from("deck_views")
        .upsert(
          { user_id: user.id, deck_id: deckId, viewed_at: new Date().toISOString() },
          { onConflict: "user_id,deck_id" }
        )
        .then(() => {});
    });
  }, [deckId, tags]);

  return null;
}