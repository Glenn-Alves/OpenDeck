import { getDeckForStudy } from "@/lib/getDeckForStudy";
import StudySession from "@/components/StudySession";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function StudyPage({
  params,
}: {
  params: { id: string };
}) {
  const deck = await getDeckForStudy(params.id);
  if (!deck) return notFound();

  if (deck.tags.length > 0) {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (user) {
      await supabase.from("tag_activity").insert(
        deck.tags.map((tag) => ({ user_id: user.id, tag }))
      );
    }
  }

  return <StudySession deckId={params.id} title={deck.title} cards={deck.cards} />;
}