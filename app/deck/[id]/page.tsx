import Link from "next/link";
import RatingStars from "@/components/RatingStars";
import RatingWidget from "@/components/RatingWidget";
import CommentForm from "@/components/CommentForm";
import CommentItem from "@/components/CommentItem";
import SaveButton from "@/components/SaveButton";
import CardManager from "@/components/CardManager";
import DeckHeaderEdit from "@/components/DeckHeaderEdit";
import SubsectionManagerDraggable from "@/components/SubsectionManagerDraggable";
import SubsectionTree from "@/components/SubsectionTree";
import DeleteDeckButton from "@/components/DeleteDeckButton";
import Breadcrumbs from "@/components/Breadcrumbs";
import ResizableImage from "@/components/ResizableImage";
import { getSubsectionTree } from "@/lib/getSubsectionTree";
import MarkDeckViewed from "@/components/MarkDeckViewed";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type ViewDeck = {
  id: string;
  title: string;
  description: string;
  author: string;
  tags: string[];
  rating: number;
  ratingCount: number;
  cardCount: number;
  ownerId: string | null;
  parentDeckId: string | null;
  cards: {
    id: string;
    front: string;
    back: string;
    frontImage: string | null;
    backImage: string | null;
    frontImageWidth: number | null;
    backImageWidth: number | null;
    cardType: "flashcard" | "multiple_choice" | "identification";
    choices: string[] | null;
  }[];
  comments: { id: string; author: string; body: string; userId: string | null }[];
};

async function getRealDeck(id: string): Promise<ViewDeck | null> {
  const supabase = await createClient();

  const { data: deck, error } = await supabase
    .from("decks")
    .select(
      "id, title, description, tags, owner_id, parent_deck_id, profiles(username), cards(id, front_text, back_text, front_image_url, back_image_url, front_image_width, back_image_width, card_type, choices), ratings(score), comments(id, body, created_at, user_id, profiles(username))"
    )
    .eq("id", id)
    .single();

  if (error || !deck) return null;

  const scores: number[] = (deck.ratings ?? []).map((r: any) => r.score);
  const avgRating = scores.length
    ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
    : 0;

  const sortedComments = [...(deck.comments ?? [])].sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return {
    id: deck.id,
    title: deck.title,
    description: deck.description ?? "",
    author: (deck as any).profiles?.username ?? "a name-placeholder user",
    tags: deck.tags ?? [],
    rating: avgRating,
    ratingCount: scores.length,
    cardCount: deck.cards?.length ?? 0,
    ownerId: (deck as any).owner_id ?? null,
    parentDeckId: (deck as any).parent_deck_id ?? null,
    cards: (deck.cards ?? []).map((c: any) => ({
      id: c.id,
      front: c.front_text,
      back: c.back_text,
      frontImage: c.front_image_url ?? null,
      backImage: c.back_image_url ?? null,
      frontImageWidth: c.front_image_width ?? null,
      backImageWidth: c.back_image_width ?? null,
      cardType: c.card_type ?? "flashcard",
      choices: c.choices ?? null,
    })),
    comments: sortedComments.map((c: any) => ({
      id: c.id,
      author: c.profiles?.username ?? "a name-placeholder user",
      body: c.body,
      userId: c.user_id ?? null,
    })),
  };
}

export default async function DeckDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData.user?.id ?? null;

  const deck = await getRealDeck(params.id);

  if (!deck) return notFound();

  const isOwner = currentUserId !== null && currentUserId === deck.ownerId;

  let parentDeck: { id: string; title: string } | null = null;
  const ancestors: { id: string; title: string }[] = [];

  if (deck.parentDeckId) {
    let currentParentId: string | null = deck.parentDeckId;
    while (currentParentId) {
      const { data: ancestorData }: { data: { id: string; title: string; parent_deck_id: string | null } | null } = await supabase
        .from("decks")
        .select("id, title, parent_deck_id")
        .eq("id", currentParentId)
        .single();

      if (!ancestorData) break;

      ancestors.unshift({ id: ancestorData.id, title: ancestorData.title });
      if (!parentDeck) parentDeck = { id: ancestorData.id, title: ancestorData.title };
      currentParentId = ancestorData.parent_deck_id ?? null;
    }
  }

  const subsectionTree = await getSubsectionTree(deck.id);

  return (
    <div className="pt-12">
      <MarkDeckViewed tags={deck.tags} />
      {/* Header */}
      <div className="pb-8 mb-8">
        <Breadcrumbs items={[...ancestors, { id: deck.id, title: deck.title }]} />
        <p className="font-display text-xs text-muted uppercase tracking-wide mb-3">
          {deck.cardCount} cards · by {deck.author}
        </p>
        <DeckHeaderEdit
          deckId={deck.id}
          initialTitle={deck.title}
          initialDescription={deck.description}
          initialTags={deck.tags}
          isOwner={isOwner}
        />

        <div className="mb-5">
          <RatingStars rating={deck.rating} count={deck.ratingCount} />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {deck.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] text-rule border border-rule/40 rounded-full px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/deck/${deck.id}/study`}
            className="bg-ink text-paper px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring"
          >
            Study this deck
          </Link>
          
            <a href={`/api/anki/export/${deck.id}`}
            className="border border-border text-ink px-5 py-2.5 rounded-sm text-sm font-medium hover:border-ink transition-colors focus-ring"
          >
            Export to Anki
          </a>
          <SaveButton deckId={deck.id} />
          {isOwner && (
            <DeleteDeckButton
              deckId={deck.id}
              redirectTo={parentDeck ? `/deck/${parentDeck.id}` : "/"}
            />
          )}
        </div>
      </div>

      {parentDeck && (
        <Link
          href={`/deck/${parentDeck.id}`}
          className="inline-block text-xs text-muted hover:text-ink transition-colors focus-ring mb-3"
        >
          ← Back to {parentDeck.title}
        </Link>
      )}

      <div>
        <section className="mb-12">
          <h2 className="font-display font-bold text-ink text-sm uppercase tracking-wide mb-4">
            Subsections
          </h2>
          {isOwner ? (
            <SubsectionManagerDraggable deckId={deck.id} initialNodes={subsectionTree} />
          ) : subsectionTree.length > 0 ? (
            <SubsectionTree nodes={subsectionTree} />
          ) : (
            <p className="text-sm text-muted">No subsections.</p>
          )}
        </section>

        {/* Card preview list */}
        <section className="mb-12">
          <h2 className="font-display font-bold text-ink text-sm uppercase tracking-wide mb-4">
            {isOwner ? "Manage cards" : "Preview"}
          </h2>
          {isOwner ? (
            <CardManager deckId={deck.id} initialCards={deck.cards} />
          ) : (
            <div className="space-y-3">
              {deck.cards.map((card) => (
                <div
                  key={card.id}
                  className="ruled margin-rule bg-card border border-border rounded-sm p-4 pl-11 grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <p className="text-sm text-ink font-medium">{card.front}</p>
                    {card.frontImage && (
                      <div className="mt-2">
                        <ResizableImage
                          src={card.frontImage}
                          width={card.frontImageWidth}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted">{card.back}</p>
                    {card.backImage && (
                      <div className="mt-2">
                        <ResizableImage
                          src={card.backImage}
                          width={card.backImageWidth}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Rate + comment */}
        <section className="mb-10">
          {currentUserId && currentUserId === deck.ownerId ? null : (
            <>
              <h2 className="font-display font-bold text-ink text-sm uppercase tracking-wide mb-4">
                Rate this deck
              </h2>
              <RatingWidget deckId={deck.id} />
            </>
          )}

          <h2 className="font-display font-bold text-ink text-sm uppercase tracking-wide mb-4">
            Comments ({deck.comments.length})
          </h2>

          <CommentForm deckId={deck.id} />

          <div className="space-y-4">
            {deck.comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
              />
            ))}
            {deck.comments.length === 0 && (
              <p className="text-sm text-muted">Be the first to say something.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}