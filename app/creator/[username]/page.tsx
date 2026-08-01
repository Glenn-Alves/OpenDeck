import { createClient } from "@/lib/supabase/server";
import DeckCard, { type DeckSummary } from "@/components/DeckCard";
import FollowButton from "@/components/FollowButton";
import { notFound } from "next/navigation";
import Link from "next/link";
export default async function CreatorPage({
  params,
}: {
  params: { username: string };
}) {
  const supabase = await createClient();
  const username = decodeURIComponent(params.username);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, created_at, avatar_url, bio")
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

  const { count: followingCount } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("follower_id", profile.id);

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

      <div className="flex items-start gap-4 mb-4">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.username}
            className="w-16 h-16 rounded-full object-cover border border-border shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-ink text-paper flex items-center justify-center text-xl font-display font-bold border border-border shrink-0">
            {profile.username.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="font-display font-bold text-ink text-2xl md:text-3xl">
            {profile.username}
          </h1>
          <p className="text-sm text-muted mt-1">
            <Link
              href={`/creator/${encodeURIComponent(profile.username)}/followers`}
              className="hover:text-ink transition-colors focus-ring"
            >
              {followerCount ?? 0} follower{followerCount === 1 ? "" : "s"}
            </Link>
            {" · "}
            <Link
              href={`/creator/${encodeURIComponent(profile.username)}/following`}
              className="hover:text-ink transition-colors focus-ring"
            >
              {followingCount ?? 0} following
            </Link>
            {" · "}
            {decks.length} deck{decks.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {profile.bio && (
        <p className="text-sm text-ink max-w-xl mb-4">{profile.bio}</p>
      )}

      {!isOwnProfile && currentUserId && (
  <div className="mb-10 flex gap-2">
    <FollowButton
      followedId={profile.id}
      initiallyFollowing={alreadyFollowing}
    />
    <Link
      href={`/messages/${encodeURIComponent(profile.username)}`}
      className="bg-card border border-border text-ink px-4 py-2 rounded-sm text-sm font-medium hover:border-ink transition-colors focus-ring"
    >
      Message
    </Link>
  </div>
)}
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