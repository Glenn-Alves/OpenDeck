import type { DeckSummary } from "@/components/DeckCard";
import { createPublicClient } from "@/lib/supabase/public";

function toSummary(d: any): DeckSummary {
  const scores: number[] = (d.ratings ?? []).map((r: any) => r.score);
  const avgRating = scores.length
    ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
    : 0;

  return {
    id: d.id,
    title: d.title,
    description: d.description ?? "",
    author: d.profiles?.username ?? "an opendeck user",
    tags: d.tags ?? [],
    rating: avgRating,
    ratingCount: scores.length,
    cardCount: d.cards?.[0]?.count ?? 0,
    difficulty: d.difficulty ?? "Medium",
    exportCount: d.export_count ?? 0,
    saveCount: d.save_count ?? 0,
    updatedAt: d.updated_at ?? d.created_at,
  };
}

const DECK_FIELDS =
  "id, title, description, tags, created_at, updated_at, export_count, save_count, difficulty, cards(count), ratings(score), profiles(username)";

export type FeaturedCreator = {
  username: string;
  deckCount: number;
  avgRating: number;
};

export async function getDiscoverySections() {
    const supabase = createPublicClient();

    const { data: allDecksRaw } = await supabase
      .from("decks")
      .select(DECK_FIELDS)
      .eq("visibility", "public")
      .is("parent_deck_id", null);

    const allDecks = allDecksRaw ?? [];

    // Recently published
    const recentlyPublished = [...allDecks]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
      .map(toSummary);

    // Most downloaded
    const mostDownloaded = [...allDecks]
      .filter((d: any) => (d.export_count ?? 0) > 0)
      .sort((a: any, b: any) => (b.export_count ?? 0) - (a.export_count ?? 0))
      .slice(0, 6)
      .map(toSummary);

    // Trending: most ratings + comments in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentRatings } = await supabase
      .from("ratings")
      .select("deck_id, created_at")
      .gte("created_at", sevenDaysAgo);

    const { data: recentComments } = await supabase
      .from("comments")
      .select("deck_id, created_at")
      .gte("created_at", sevenDaysAgo);

    const activityCount = new Map<string, number>();
    for (const r of recentRatings ?? []) {
      activityCount.set(r.deck_id, (activityCount.get(r.deck_id) ?? 0) + 1);
    }
    for (const c of recentComments ?? []) {
      activityCount.set(c.deck_id, (activityCount.get(c.deck_id) ?? 0) + 1);
    }

    const deckById = new Map(allDecks.map((d: any) => [d.id, d]));
    const trending = Array.from(activityCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([deckId]) => deckById.get(deckId))
      .filter(Boolean)
      .map(toSummary);

    // Featured creators: most decks published, tie-broken by average rating
    const creatorStats = new Map<string, { deckCount: number; scores: number[] }>();
    for (const d of allDecks as any[]) {
      const username = d.profiles?.username;
      if (!username) continue;
      const scores: number[] = (d.ratings ?? []).map((r: any) => r.score);
      const existing = creatorStats.get(username) ?? { deckCount: 0, scores: [] };
      existing.deckCount += 1;
      existing.scores.push(...scores);
      creatorStats.set(username, existing);
    }

    const featuredCreators: FeaturedCreator[] = Array.from(creatorStats.entries())
      .map(([username, stats]) => ({
        username,
        deckCount: stats.deckCount,
        avgRating: stats.scores.length
          ? stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length
          : 0,
      }))
      .sort((a, b) => b.deckCount - a.deckCount || b.avgRating - a.avgRating)
      .slice(0, 6);

    // Popular tags: raw frequency across all decks
    const tagCount = new Map<string, number>();
    for (const d of allDecks as any[]) {
      for (const tag of d.tags ?? []) {
        tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
      }
    }
    const popularTags = Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag]) => tag);

    return {
      trending,
      recentlyPublished,
      mostDownloaded,
      featuredCreators,
      popularTags,
    };
}