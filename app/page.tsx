import Link from "next/link";
import { cookies } from "next/headers";
import DeckCard, { type DeckSummary } from "@/components/DeckCard";
import DeckRow from "@/components/DeckRow";
import FeaturedCreators from "@/components/FeaturedCreators";

import { getDiscoverySections } from "@/lib/getDiscoverySections";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

async function getRealDecks(): Promise<DeckSummary[]> {
    const supabase = createPublicClient();

    const { data, error } = await supabase
    .from("decks")
    .select(
      "id, title, description, tags, created_at, updated_at, export_count, save_count, difficulty, cards(count), ratings(score), profiles(username)"
    )
    .eq("visibility", "public")
    .is("parent_deck_id", null)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to load decks:", error?.message);
    return [];
  }

return data.map((row: any) => {
      const scores: number[] = (row.ratings ?? []).map((r: any) => r.score);
      const avgRating = scores.length
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

      return {
        id: row.id,
        title: row.title,
        description: row.description ?? "",
        author: row.profiles?.username ?? "an opendeck user",
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
}

type RecentlyVisitedDeck = { id: string; title: string; cardCount: number };

async function getRecentlyVisitedDecks(userId: string): Promise<RecentlyVisitedDeck[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deck_views")
    .select("viewed_at, decks(id, title, cards(count))")
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false })
    .limit(6);

  if (error || !data) return [];

  return data
    .map((row: any) => row.decks)
    .filter((deck: any) => Boolean(deck))
    .map((deck: any) => ({
      id: deck.id,
      title: deck.title,
      cardCount: deck.cards?.[0]?.count ?? 0,
    }));
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { q?: string; tag?: string };
}) {
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const activeTag = searchParams.tag ?? "";
  const isBrowsing = !q && !activeTag;

  const cookieStore = await cookies();
  let recentDeckTags: string[] = [];
  try {
    const raw = cookieStore.get("recentDeckTags")?.value;
    if (raw) recentDeckTags = JSON.parse(decodeURIComponent(raw));
  } catch {
    recentDeckTags = [];
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData.user?.id ?? null;

  const recentlyVisited = currentUserId ? await getRecentlyVisitedDecks(currentUserId) : [];

  const allDecks = await getRealDecks();
  const allTagsSet = new Set(allDecks.flatMap((d) => d.tags));
  const visibleTags = recentDeckTags.filter((t) => allTagsSet.has(t));

 const filteredDecks = allDecks.filter((deck) => {
    const matchesTag = activeTag ? deck.tags.includes(activeTag) : true;
   const matchesQuery = q
      ? deck.title.toLowerCase().includes(q) ||
        deck.description.toLowerCase().includes(q) ||
        deck.tags.some((t) => t.toLowerCase().includes(q)) ||
        deck.author.toLowerCase().includes(q)
      : true;
    return matchesTag && matchesQuery;
  });

  const discovery = isBrowsing ? await getDiscoverySections() : null;
  const matchingCreators = q
    ? Array.from(new Set(allDecks.filter((d) => d.author.toLowerCase().includes(q)).map((d) => d.author))).map(
        (author) => ({
          username: author,
          deckCount: allDecks.filter((d) => d.author === author).length,
        })
      )
    : [];

  function tagHref(tag: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tag) params.set("tag", tag);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <div>
      {/* Hero */}
      <section className="pt-16 pb-10 border-b border-border mb-10">
        <p className="font-display text-xs text-margin uppercase tracking-widest mb-3">
          An open source of decks, made by everyone!
        </p>
        <h1 className="font-display font-bold text-ink text-3xl md:text-4xl leading-tight max-w-2xl mb-5">
          Find a flashcard deck someone already made for the thing you're studying.
        </h1>
        <p className="text-muted max-w-xl mb-8">
          Browse decks other students published, or bring your own from Anki
          and share it back.
        </p>

        <form className="flex gap-2 max-w-xl" role="search">
          {activeTag && <input type="hidden" name="tag" value={activeTag} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search"
            className="flex-1 bg-card border-2 border-border rounded-sm px-4 py-3 text-sm text-ink placeholder:text-muted focus-ring"
          />
          <button
            type="submit"
            className="bg-ink text-paper px-5 py-3 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring"
          >
            Search
          </button>
        </form>
      </section>

      {/* Recently visited - logged-in users only, same layout on every screen size */}
      {recentlyVisited.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display font-bold text-ink text-sm uppercase tracking-wide mb-4">
            Recently Visited
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {recentlyVisited.map((deck) => (
              <Link
                key={deck.id}
                href={`/deck/${deck.id}`}
                className="min-w-[160px] flex-shrink-0 bg-card border border-border rounded-sm px-4 py-3 hover:border-ink transition-colors focus-ring block"
              >
                <p className="font-display font-bold text-ink text-sm truncate">
                  {deck.title}
                </p>
                <p className="text-xs text-muted mt-1">
                  {deck.cardCount} card{deck.cardCount !== 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tag filter row - only the last-viewed deck's own tags */}
      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href={tagHref("")}
            className={`text-xs rounded-full px-3 py-1.5 focus-ring transition-colors ${
              !activeTag
                ? "bg-ink text-paper"
                : "text-muted border border-border hover:border-rule hover:text-ink"
            }`}
          >
            All decks
          </Link>
          {visibleTags.map((tag) => (
            <Link
              key={tag}
              href={tagHref(tag)}
              className={`text-xs rounded-full px-3 py-1.5 focus-ring transition-colors ${
                activeTag === tag
                  ? "bg-ink text-paper"
                  : "text-muted border border-border hover:border-rule hover:text-ink"

              }`}
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      {/* Discovery sections - only on the plain landing view */}
      {discovery && (
        <>
          <DeckRow title="Trending" decks={discovery.trending} />
          <DeckRow title="Recently Published" decks={discovery.recentlyPublished} />
          <DeckRow title="Most Downloaded" decks={discovery.mostDownloaded} />
          <FeaturedCreators creators={discovery.featuredCreators} />

          {discovery.popularTags.length > 0 && (
            <section className="mb-10">
              <h2 className="font-display font-bold text-ink text-sm uppercase tracking-wide mb-4">
                Popular Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {discovery.popularTags.map((tag) => (
                  <Link
                    key={tag}
                    href={tagHref(tag)}
className="text-xs text-muted border border-border rounded-full px-3 py-1.5 hover:border-rule hover:text-ink transition-colors focus-ring"                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </section>
          )}

<div className="border-t border-border mb-10" />        </>
      )}
      {matchingCreators.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display font-bold text-ink text-sm uppercase tracking-wide mb-4">
            Creators
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {matchingCreators.map((creator) => (
              <Link
                key={creator.username}
                href={`/creator/${encodeURIComponent(creator.username)}`}
                className="min-w-[160px] flex-shrink-0 bg-card border border-border rounded-sm px-4 py-3 hover:border-ink transition-colors focus-ring block"
              >
                <p className="font-display font-bold text-ink text-sm truncate">
                  {creator.username}
                </p>
                <p className="text-xs text-muted mt-1">
                  {creator.deckCount} deck{creator.deckCount !== 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Deck grid */}
      <h2 className="font-display font-bold text-ink text-sm uppercase tracking-wide mb-4">
        {isBrowsing ? "All Decks" : "Results"}
      </h2>
     
      {filteredDecks.length > 0 ? (
        <section aria-label="Decks" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDecks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </section>
      ) : (
        <p className="text-sm text-muted">
          No decks match{q ? ` "${q}"` : ""}{activeTag ? ` in "${activeTag}"` : ""}. Try a different search or{" "}
          <Link href="/" className="text-rule hover:text-ink transition-colors focus-ring">
            clear filters
          </Link>
          .
        </p>
      )}
    </div>
  );
}