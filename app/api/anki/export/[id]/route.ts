import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import AnkiExport from "anki-apkg-export";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const { data: deck, error } = await supabase
    .from("decks")
    .select("title, cards(front_text, back_text)")
    .eq("id", params.id)
    .single();

  if (error || !deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  const cards = (deck.cards ?? []) as { front_text: string; back_text: string }[];

  if (cards.length === 0) {
    return NextResponse.json(
      { error: "This deck has no cards to export" },
      { status: 400 }
    );
  }

  const apkg = new AnkiExport(deck.title || "Deck");
  for (const c of cards) {
    apkg.addCard(c.front_text, c.back_text);
  }

  const zip = await apkg.save();

  // Best-effort don't fail the export if this doesn't work
  // Best-effort don't fail the export if this doesn't work
const { error: rpcError } = await supabase.rpc("increment_export_count", {
  target_deck_id: params.id,
});
if (rpcError) {
  console.error("Failed to increment export_count:", rpcError.message);
}
  const buffer = Buffer.from(zip, "binary");

  const safeName = (deck.title || "deck").replace(/[^a-z0-9\-_]+/gi, "_");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}.apkg"`,
      "Content-Length": String(buffer.length),
    },
  });
}