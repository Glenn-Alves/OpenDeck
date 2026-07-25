import { createClient } from "@/lib/supabase/server";
import DeckCard, { type DeckSummary } from "@/components/DeckCard";
import FollowButton from "@/components/FollowButton";
import { notFound } from "next/navigation";

export default async function CreatorPage({
  params,
}: {
  params: { username: string };
}) {
  const supabase = await createClient();
  const username = decodeURIComponent(params.username);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, created_at")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return notFound();

  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData.user?.id ?? null;
  const isOwnProfile = currentUserId === profile.id;

  const { count: followerCount } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("followed_id", profile.id);

  let alreadyFollowing = false;
  if (currentUserId) {
    const { data: existingFollow } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUserId)
      .eq("followed_id", profile.id)
      .maybeSingle();
    alreadyFollowing = Boolean(existingFollow);
  }

  const { data: decksData } = await supabase
    .from("decks")
    .select(
      "id, title, description, tags, created_at, updated_at, export_count, save_count, difficulty, cards(count), ratings(score)"
    )
    .eq("owner_id", profile.id)
    .eq("visibility", "public")
    .is("parent_deck_id", null)
    .order("created_at", { ascending: false });

  const decks: DeckSummary[] = (decksData ?? []).map((row: any) => {
    const scores: number[] = (row.ratings ?? []).map((r: any) => r.score);
    const avgRating = scores.length
      ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
      : 0;
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? "",
      author: profile.username,
      tags: row.tags ?? [],
      rating: avgRating,
      ratingCount: scores.length,
      cardCount: row.cards?.[0]?.count ?? 0,
      difficulty: row.difficulty ?? "Medium",
      exportCount: row.export_count ?? 0,
      saveCount: row.save_count ?? 0,
      updatedAt: row.updated_at ?? row.created_at,
    };
  });

  return (
    <div className="pt-12">
      <p className="font-display text-xs text-margin uppercase tracking-widest mb-3">
        creator
      </p>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display font-bold text-ink text-2xl md:text-3xl">
          {profile.username}
        </h1>
        {!isOwnProfile && currentUserId && (
          <FollowButton
            followedId={profile.id}
            initiallyFollowing={alreadyFollowing}
          />
        )}
      </div>
      <p className="text-sm text-muted mb-10">
        {followerCount ?? 0} follower{followerCount === 1 ? "" : "s"} ·{" "}
        {decks.length} deck{decks.length !== 1 ? "s" : ""}
      </p>

      {decks.length > 0 ? (
        <section
          aria-label="Decks"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </section>
      ) : (
        <p className="text-sm text-muted">No public decks yet.</p>
      )}
    </div>
  );
}